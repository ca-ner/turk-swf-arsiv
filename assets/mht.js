// MHT (MHTML) görüntüleyici. Tarayıcılar .mht dosyalarını doğrudan açmadığı
// için dosyayı istemci tarafında çözümleriz: MIME multipart parçalarına ayırıp
// gömülü kaynakları (görsel/CSS) data-URI olarak HTML'e gömer ve sonucu
// sandbox'lı bir <iframe> içinde gösteririz. İçerik adı üstte, içerik altta
// ayrı bir çerçevede. Ok tuşlarıyla (→ / ←) aynı kategoride gezinilir.
(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const stageMsg = document.getElementById("stageMsg");
  const titleEl = document.getElementById("title");
  const backLink = document.getElementById("backLink");
  const fsBtn = document.getElementById("fsBtn");
  const shareBtn = document.getElementById("shareBtn");
  const shareRow = document.getElementById("shareRow");
  const shareUrl = document.getElementById("shareUrl");
  const copyBtn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");

  const CATEGORY = "forum_thg_tr";

  // ---------- yardımcılar ----------
  function latin1(bytes) {
    let s = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return s;
  }
  function bytesToBase64(bytes) {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    const bin = atob(b64.replace(/\s+/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
    return out;
  }
  function qpToBytes(str) {
    str = str.replace(/=\r?\n/g, ""); // yumuşak satır sonları
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "=") {
        const hex = str.substr(i + 1, 2);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          out.push(parseInt(hex, 16));
          i += 2;
        } else out.push(61);
      } else out.push(str.charCodeAt(i) & 0xff);
    }
    return new Uint8Array(out);
  }
  function decodeText(bytes, charset) {
    try {
      return new TextDecoder(charset || "utf-8").decode(bytes);
    } catch (_) {
      try {
        return new TextDecoder("utf-8").decode(bytes);
      } catch (_2) {
        return latin1(bytes);
      }
    }
  }

  // Katlanmış (folded) başlıkları çözerek başlık haritası üretir.
  function parseHeaders(raw) {
    const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
    const headers = {};
    unfolded.split(/\r?\n/).forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const k = line.slice(0, idx).trim().toLowerCase();
        const v = line.slice(idx + 1).trim();
        headers[k] = v;
      }
    });
    return headers;
  }
  function paramFrom(headerValue, name) {
    if (!headerValue) return null;
    const re = new RegExp(name + '\\s*=\\s*"?([^";]+)"?', "i");
    const m = re.exec(headerValue);
    return m ? m[1].trim() : null;
  }

  // ---------- MHTML -> HTML ----------
  function parseMhtml(bytes) {
    const raw = latin1(bytes);

    // Üst başlıkları ilk boş satıra kadar al
    const headerEnd = raw.search(/\r?\n\r?\n/);
    const topHeaders = parseHeaders(raw.slice(0, headerEnd < 0 ? raw.length : headerEnd));
    const ctype = topHeaders["content-type"] || "";
    let boundary = paramFrom(ctype, "boundary");
    if (!boundary) throw new Error("MHTML boundary bulunamadı");

    const delimiter = "--" + boundary;
    const rawParts = raw.split(delimiter);
    const parts = [];
    for (let i = 1; i < rawParts.length; i++) {
      let seg = rawParts[i];
      if (seg.slice(0, 2) === "--") break; // kapanış
      seg = seg.replace(/^\r?\n/, "");
      const hEnd = seg.search(/\r?\n\r?\n/);
      if (hEnd < 0) continue;
      const headers = parseHeaders(seg.slice(0, hEnd));
      let body = seg.slice(hEnd).replace(/^\r?\n\r?\n/, "");
      body = body.replace(/\r?\n$/, "");
      const enc = (headers["content-transfer-encoding"] || "").toLowerCase();
      let partBytes;
      if (enc === "base64") partBytes = base64ToBytes(body);
      else if (enc === "quoted-printable") partBytes = qpToBytes(body);
      else {
        const arr = new Uint8Array(body.length);
        for (let j = 0; j < body.length; j++) arr[j] = body.charCodeAt(j) & 0xff;
        partBytes = arr;
      }
      const partCtype = headers["content-type"] || "application/octet-stream";
      parts.push({
        contentType: partCtype.split(";")[0].trim(),
        charset: paramFrom(partCtype, "charset"),
        location: headers["content-location"] || null,
        id: (headers["content-id"] || "").replace(/^<|>$/g, "") || null,
        bytes: partBytes,
      });
    }

    if (!parts.length) throw new Error("MHTML parçası yok");

    // Kök HTML parçasını seç
    const startId = (paramFrom(ctype, "start") || "").replace(/^<|>$/g, "");
    const rootLoc = topHeaders["snapshot-content-location"] || null;
    let root =
      (startId && parts.find((p) => p.id === startId)) ||
      (rootLoc && parts.find((p) => p.location === rootLoc)) ||
      parts.find((p) => /^text\/html/i.test(p.contentType)) ||
      parts[0];

    // Kaynak parçaları data-URI'ye çevir
    const byLocation = {};
    const byId = {};
    for (const p of parts) {
      if (p === root) continue;
      const dataUri = "data:" + p.contentType + ";base64," + bytesToBase64(p.bytes);
      if (p.location) byLocation[p.location] = dataUri;
      if (p.id) byId[p.id] = dataUri;
    }

    // Kök HTML'i çöz (charset: parça > <meta> > utf-8)
    let charset = root.charset;
    if (!charset) {
      const probe = latin1(root.bytes).slice(0, 4096);
      const m = /charset\s*=\s*["']?([\w-]+)/i.exec(probe);
      if (m) charset = m[1];
    }
    let html = decodeText(root.bytes, charset);

    // Gömülü kaynak referanslarını değiştir
    for (const loc in byLocation) {
      html = html.split(loc).join(byLocation[loc]);
    }
    for (const id in byId) {
      html = html.split("cid:" + id).join(byId[id]);
    }

    // Orijinal charset bildirimini nötrle (çıktı utf-8), linkleri yeni sekmeye yönlendir
    html = html.replace(
      /(<meta[^>]+)charset\s*=\s*["']?[\w-]+(["']?)/gi,
      '$1charset=utf-8$2'
    );
    if (!/<base\b/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, '<head$1><base target="_blank">');
    }
    return html;
  }

  // ---------- görüntüleme ----------
  const params = new URLSearchParams(window.location.search);
  let file = params.get("file") || "";
  try {
    file = decodeURIComponent(file);
  } catch (_) {}

  function isSafe(p) {
    if (!p) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return false;
    if (p.startsWith("/") || p.startsWith("\\")) return false;
    if (p.split(/[\\/]/).some((s) => s === "..")) return false;
    return /\.mht(ml)?$/i.test(p);
  }
  function titleFromFilename(name) {
    const base = name.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/i, "");
    const spaced = base.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
    return spaced
      .split(" ")
      .map((w) => (w ? w[0].toLocaleUpperCase("tr-TR") + w.slice(1) : w))
      .join(" ");
  }
  function showMessage(html) {
    stageMsg.innerHTML = html;
    stageMsg.style.display = "flex";
  }
  function hideMessage() {
    stageMsg.style.display = "none";
  }

  if (!isSafe(file)) {
    titleEl.textContent = "Geçersiz içerik";
    document.title = "Geçersiz içerik — Türk İnternet Arkeolojisi";
    showMessage(
      '<div style="font-size:2rem">⚠️</div><div>Geçerli bir MHT dosyası belirtilmedi.</div>' +
        '<div><a href="forum.html">← Foruma dön</a></div>'
    );
    return;
  }

  function titleFor(f) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories[CATEGORY];
    if (cat && Array.isArray(cat.items)) {
      const match = cat.items.find((it) => it.file === f);
      if (match && match.title) return match.title;
    }
    return titleFromFilename(f);
  }
  function neighbor(f, dir) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories[CATEGORY];
    const items = (cat && cat.items) || [];
    if (items.length < 2) return null;
    const i = items.findIndex((it) => it.file === f);
    if (i < 0) return null;
    const n = items.length;
    return items[(i + dir + n) % n];
  }

  let iframe = document.createElement("iframe");
  iframe.className = "mht-frame";
  iframe.setAttribute("sandbox", "allow-same-origin allow-popups");
  iframe.setAttribute("referrerpolicy", "no-referrer");
  iframe.title = "MHT içeriği";
  stage.appendChild(iframe);

  let currentBlobUrl = null;
  let displayTitle = "";
  let pageUrl = window.location.href;

  async function load(f) {
    file = f;
    displayTitle = titleFor(f);
    titleEl.textContent = displayTitle;
    document.title = displayTitle + " — Türk İnternet Arkeolojisi";
    try {
      history.replaceState(null, "", location.pathname + "?file=" + encodeURIComponent(f));
    } catch (_) {}
    pageUrl = window.location.href;
    shareUrl.value = pageUrl;
    shareRow.classList.remove("open");

    showMessage('<div class="spinner"></div><div>İçerik çözümleniyor…</div>');
    try {
      const resp = await fetch("arsiv/" + f, { cache: "no-cache" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const html = parseMhtml(bytes);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = URL.createObjectURL(blob);
      iframe.onload = hideMessage;
      iframe.src = currentBlobUrl;
      setTimeout(hideMessage, 600);
    } catch (err) {
      showMessage(
        '<div style="font-size:2rem">⚠️</div><div>MHT içeriği görüntülenemedi.</div>' +
          '<div style="font-size:.8rem;opacity:.7">' +
          (err && err.message ? String(err.message) : "") +
          "</div>"
      );
    }
  }

  function navigate(dir) {
    const nx = neighbor(file, dir);
    if (nx) load(nx.file);
  }

  // Kategori önekinden geri bağlantı
  backLink.href = "forum.html";

  load(file);

  // ---- Ok tuşlarıyla gezinme ----
  document.addEventListener("keydown", function (e) {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      navigate(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      navigate(-1);
    }
  });

  // ---- Kontroller ----
  fsBtn.addEventListener("click", function () {
    if (document.fullscreenElement) {
      document.exitFullscreen && document.exitFullscreen();
      return;
    }
    if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
    else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
  });

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }
  shareBtn.addEventListener("click", async function () {
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, url: pageUrl });
        return;
      } catch (_) {}
    }
    shareRow.classList.toggle("open");
    if (shareRow.classList.contains("open")) {
      shareUrl.focus();
      shareUrl.select();
    }
  });
  copyBtn.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(pageUrl);
      showToast("Bağlantı kopyalandı");
    } catch (_) {
      shareUrl.select();
      document.execCommand && document.execCommand("copy");
      showToast("Bağlantı kopyalandı");
    }
  });
})();
