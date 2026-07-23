// Görüntüleyici: GIF/foto içeriğini tam sayfa gösterir. İçerik adı üstte,
// içerik altta tam alanda. Ok tuşlarıyla (→ sonraki, ← önceki) aynı kategori
// içinde gezinilebilir. Paylaşılabilir bağlantı ve tam ekran desteği.
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

  const IMAGE_EXTS = ["gif", "jpg", "jpeg", "png", "webp", "avif", "bmp", "svg"];

  const params = new URLSearchParams(window.location.search);
  let file = params.get("file") || "";
  try {
    file = decodeURIComponent(file);
  } catch (_) {}

  function extOf(p) {
    const m = /\.([^.]+)$/.exec(p);
    return m ? m[1].toLowerCase() : "";
  }

  function isSafeRelativePath(p) {
    if (!p) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return false; // http:, data: vb.
    if (p.startsWith("/") || p.startsWith("\\")) return false;
    if (p.split(/[\\/]/).some((seg) => seg === "..")) return false;
    return IMAGE_EXTS.includes(extOf(p));
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

  if (!isSafeRelativePath(file)) {
    titleEl.textContent = "Geçersiz içerik";
    document.title = "Geçersiz içerik — Türk İnternet Arkeolojisi";
    showMessage(
      '<div style="font-size:2rem">⚠️</div><div>Geçerli bir görsel belirtilmedi.</div>' +
        '<div><a href="index.html">← Arşive dön</a></div>'
    );
    return;
  }

  // Kategori önekinden geri bağlantıyı belirle (gif/ -> gif.html, foto/ -> foto.html)
  const catPrefix = file.split("/")[0];
  if (catPrefix === "gif") backLink.href = "gif.html";
  else if (catPrefix === "foto") backLink.href = "foto.html";

  // Başlığı (varsa) manifestten al, yoksa dosya adından üret.
  function titleFor(f) {
    const m = window.ARSIV_MANIFEST;
    if (m && m.categories) {
      for (const key in m.categories) {
        const match = (m.categories[key].items || []).find((it) => it.file === f);
        if (match && match.title) return match.title;
      }
    }
    return titleFromFilename(f);
  }

  // Aynı kategorideki komşu içerik; başa/sona gelince döner.
  function neighbor(f, dir) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories[catPrefix];
    const items = (cat && cat.items) || [];
    if (items.length < 2) return null;
    const i = items.findIndex((it) => it.file === f);
    if (i < 0) return null;
    const n = items.length;
    return items[(i + dir + n) % n];
  }

  const img = document.createElement("img");
  img.className = "media";
  img.decoding = "async";
  img.addEventListener("load", hideMessage);
  img.addEventListener("error", function () {
    showMessage('<div style="font-size:2rem">⚠️</div><div>İçerik yüklenemedi.</div>');
  });
  stage.appendChild(img);

  let displayTitle = "";
  let pageUrl = window.location.href;

  function applyFile(f) {
    file = f;
    displayTitle = titleFor(f);
    titleEl.textContent = displayTitle;
    document.title = displayTitle + " — Türk İnternet Arkeolojisi";
    img.alt = displayTitle;
    showMessage('<div class="spinner"></div><div>İçerik yükleniyor…</div>');
    img.src = "arsiv/" + f;
    try {
      history.replaceState(null, "", location.pathname + "?file=" + encodeURIComponent(f));
    } catch (_) {}
    pageUrl = window.location.href;
    shareUrl.value = pageUrl;
    shareRow.classList.remove("open");
  }

  function navigate(dir) {
    const nx = neighbor(file, dir);
    if (nx) applyFile(nx.file);
  }

  applyFile(file);

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
