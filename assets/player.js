// Tekil SWF oynatıcı: içerik adı üstte, içerik tam sayfa altta.
// Ruffle ile eklenti gerektirmeden oynatılır; ana zaman çizelgesi
// varsayılan olarak döngüde çalışır (klasik Flash davranışı).
(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const stageMsg = document.getElementById("stageMsg");
  const titleEl = document.getElementById("title");
  const fsBtn = document.getElementById("fsBtn");
  const shareBtn = document.getElementById("shareBtn");
  const shareRow = document.getElementById("shareRow");
  const shareUrl = document.getElementById("shareUrl");
  const copyBtn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");

  // ---- Parametre okuma & güvenlik ----
  const params = new URLSearchParams(window.location.search);
  let file = params.get("file") || "";
  try {
    file = decodeURIComponent(file);
  } catch (_) {}

  function isSafeRelativePath(p) {
    if (!p) return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return false; // http:, data:, vs.
    if (p.startsWith("/") || p.startsWith("\\")) return false; // kök/absolut
    if (p.split(/[\\/]/).some((seg) => seg === "..")) return false; // dizin çıkışı
    return /\.swf$/i.test(p);
  }

  function titleFromFilename(name) {
    const base = name.replace(/^.*[\\/]/, "").replace(/\.swf$/i, "");
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
    document.title = "Geçersiz içerik — SWF Arşivi";
    showMessage(
      '<div style="font-size:2rem">⚠️</div><div>Geçerli bir SWF belirtilmedi.</div>' +
        '<div><a href="index.html">← Arşive dön</a></div>'
    );
    return;
  }

  // Başlığı manifestten al (varsa), yoksa dosya adından üret.
  function titleFor(f) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories.swf;
    if (cat && Array.isArray(cat.items)) {
      const match = cat.items.find((it) => it.file === f);
      if (match && match.title) return match.title;
    }
    return titleFromFilename(f);
  }

  // Aynı kategorideki (swf) komşu içerik; başa/sona gelince döner.
  function neighbor(f, dir) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories.swf;
    const items = (cat && cat.items) || [];
    if (items.length < 2) return null;
    const i = items.findIndex((it) => it.file === f);
    if (i < 0) return null;
    const n = items.length;
    return items[(i + dir + n) % n];
  }

  let displayTitle = titleFor(file);
  titleEl.textContent = displayTitle;
  document.title = displayTitle + " — SWF Arşivi";

  // ---- Ruffle oynatıcı ----
  let player = null;
  const loadOptions = {
    url: "arsiv/" + file,
    autoplay: "on",
    // Ana zaman çizelgesi Flash'ta varsayılan olarak döngüde döner.
    letterbox: "on", // içeriği en-boy oranını koruyarak tam alana yerleştir
    scale: "showAll",
    quality: "high",
    contextMenu: "on",
    wmode: "opaque",
    unmuteOverlay: "hidden",
    preferredRenderer: "webgl",
    logLevel: "error",
  };

  function setupPlayer() {
    if (!window.RufflePlayer || !window.RufflePlayer.newest) {
      showMessage(
        '<div style="font-size:2rem">⚠️</div>' +
          "<div>Ruffle yüklenemedi. Sayfayı yenilemeyi deneyin.</div>"
      );
      return;
    }
    const ruffle = window.RufflePlayer.newest();
    player = ruffle.createPlayer();
    player.id = "rufflePlayer";
    stage.appendChild(player);

    player.addEventListener("loadedmetadata", hideMessage);

    setFile(file);
  }

  // Farklı bir SWF'e (ok tuşuyla) geçiş: içeriği yerinde değiştirir.
  function setFile(f) {
    file = f;
    displayTitle = titleFor(f);
    titleEl.textContent = displayTitle;
    document.title = displayTitle + " — SWF Arşivi";
    loadOptions.url = "arsiv/" + f;
    try {
      history.replaceState(null, "", location.pathname + "?file=" + encodeURIComponent(f));
    } catch (_) {}
    pageUrl = window.location.href;
    shareUrl.value = pageUrl;
    shareRow.classList.remove("open");
    load();
  }

  function navigate(dir) {
    const nx = neighbor(file, dir);
    if (nx) setFile(nx.file);
  }

  function load() {
    showMessage('<div class="spinner"></div><div>İçerik yükleniyor…</div>');
    player
      .load(loadOptions)
      .then(() => {
        // metadata olayı gelmezse de kısa süre sonra mesajı gizle
        setTimeout(hideMessage, 400);
      })
      .catch((err) => {
        showMessage(
          '<div style="font-size:2rem">⚠️</div>' +
            "<div>İçerik yüklenemedi.</div>" +
            '<div style="font-size:.8rem;opacity:.7">' +
            (err && err.message ? String(err.message) : "") +
            "</div>"
        );
      });
  }

  // ---- Kontroller ----
  fsBtn.addEventListener("click", function () {
    const el = stage;
    if (document.fullscreenElement) {
      document.exitFullscreen && document.exitFullscreen();
      return;
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(tryRuffleFullscreen);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else {
      tryRuffleFullscreen();
    }
  });
  function tryRuffleFullscreen() {
    try {
      if (player && typeof player.enterFullscreen === "function") {
        player.enterFullscreen();
      }
    } catch (_) {}
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  let pageUrl = window.location.href;
  shareUrl.value = pageUrl;

  // ---- Ok tuşlarıyla gezinme (→ sonraki, ← önceki) ----
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

  shareBtn.addEventListener("click", async function () {
    if (navigator.share) {
      try {
        await navigator.share({ title: displayTitle, url: pageUrl });
        return;
      } catch (_) {
        // paylaşım iptal edildi ya da desteklenmiyor → satırı göster
      }
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

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setupPlayer();
  } else {
    window.addEventListener("DOMContentLoaded", setupPlayer);
  }
})();
