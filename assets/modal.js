// Sayfa içi SWF oynatıcı (modal). Galeri kartına veya "Rastgele!" düğmesine
// yapılan tıklama bir kullanıcı etkileşimi olduğundan, ses tarayıcı tarafından
// engellenmeden anında başlar — ekstra "sesi aç" tıklaması gerekmez.
(function () {
  "use strict";

  let overlay = null;
  let player = null;
  let currentFile = "";
  let toastEl = null;

  const RUFFLE_CFG = {
    autoplay: "on",
    letterbox: "on",
    scale: "showAll",
    quality: "high",
    contextMenu: "on",
    wmode: "opaque",
    unmuteOverlay: "hidden",
    preferredRenderer: "webgl",
    logLevel: "error",
  };

  function ensure() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "swf-modal";
    overlay.innerHTML =
      '<div class="swf-modal-bar">' +
      '  <div class="swf-modal-title" id="swfModalTitle"></div>' +
      '  <div class="swf-modal-controls">' +
      '    <button class="icon-btn" data-act="fs" type="button" title="Tam ekran"><span aria-hidden="true">⛶</span></button>' +
      '    <button class="icon-btn primary" data-act="share" type="button" title="Paylaş"><span aria-hidden="true">↗</span></button>' +
      '    <button class="icon-btn" data-act="close" type="button" title="Kapat (Esc)"><span aria-hidden="true">✕</span></button>' +
      "  </div>" +
      "</div>" +
      '<div class="swf-modal-stage" id="swfModalStage"></div>';
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.getAttribute("data-act");
      if (act === "close") close();
      else if (act === "fs") toggleFs();
      else if (act === "share") share();
    });

    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    });

    return overlay;
  }

  // Aynı kategorideki (swf) komşu içeriği bulur; başa/sona gelince döner.
  function neighbor(file, dir) {
    const m = window.ARSIV_MANIFEST;
    const cat = m && m.categories && m.categories.swf;
    const items = (cat && cat.items) || [];
    if (items.length < 2) return null;
    const i = items.findIndex((it) => it.file === file);
    if (i < 0) return null;
    const n = items.length;
    return items[(i + dir + n) % n];
  }

  function step(dir) {
    const nx = neighbor(currentFile, dir);
    if (nx) open(nx.file, nx.title);
  }

  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  function playerUrlFor(file) {
    const dir = location.pathname.replace(/[^/]*$/, "");
    return location.origin + dir + "player.html?file=" + encodeURIComponent(file);
  }

  function open(file, title) {
    ensure();
    currentFile = file;
    overlay.querySelector("#swfModalTitle").textContent = title || "";
    const stage = overlay.querySelector("#swfModalStage");
    stage.innerHTML = "";
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";

    if (window.RufflePlayer && window.RufflePlayer.newest) {
      const ruffle = window.RufflePlayer.newest();
      player = ruffle.createPlayer();
      stage.appendChild(player);
      const cfg = Object.assign({ url: "arsiv/" + file }, RUFFLE_CFG);
      player.load(cfg).catch(function () {
        stage.innerHTML =
          '<div class="swf-modal-msg">İçerik yüklenemedi.</div>';
      });
    } else {
      // Ruffle yoksa tam sayfa oynatıcıya yönlendir
      location.href = playerUrlFor(file);
    }
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    const stage = overlay.querySelector("#swfModalStage");
    stage.innerHTML = "";
    player = null;
  }

  function toggleFs() {
    const stage = overlay.querySelector("#swfModalStage");
    if (document.fullscreenElement) {
      document.exitFullscreen && document.exitFullscreen();
      return;
    }
    if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
    else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
  }

  async function share() {
    const url = playerUrlFor(currentFile);
    const title = overlay.querySelector("#swfModalTitle").textContent;
    if (navigator.share) {
      try {
        await navigator.share({ title: title, url: url });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Bağlantı kopyalandı");
    } catch (_) {
      toast(url);
    }
  }

  window.ArsivModal = { openSwf: open, close: close };
})();
