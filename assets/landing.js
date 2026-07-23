// Ana sayfa: kategori önizleme kutularını manifestten oluşturur.
// Alt galerilerle aynı kart tasarımını kullanır; GIF/Foto için gerçek
// küçük önizlemeler (2x2), SWF için oynatma kutusu gösterir.
(function () {
  "use strict";

  const grid = document.getElementById("cats");

  const CATS = [
    { key: "swf", emoji: "📼", label: "SWF", href: "swf.html", desc: "Flash animasyonları ve mini oyunlar" },
    { key: "gif", emoji: "🎞️", label: "GIF", href: "gif.html", desc: "Hareketli GIF'ler" },
    { key: "foto", emoji: "🖼️", label: "Foto", href: "foto.html", desc: "Fotoğraflar ve görseller" },
  ];

  function getManifest() {
    if (window.ARSIV_MANIFEST) return Promise.resolve(window.ARSIV_MANIFEST);
    return fetch("manifest.json", { cache: "no-cache" }).then((r) =>
      r.ok ? r.json() : null
    );
  }

  function makeImg(item) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.src = item.path;
    return img;
  }

  function imageThumb(items) {
    // Tek içerik varsa kutuyu tümüyle doldur; birden fazlaysa 2x2 önizleme.
    if (items.length <= 1) {
      if (items.length === 1) return makeImg(items[0]);
      const ph = document.createElement("div");
      ph.className = "preview-grid";
      const t = document.createElement("div");
      t.className = "tile empty";
      ph.appendChild(t);
      ph.style.gridTemplateColumns = "1fr";
      ph.style.gridTemplateRows = "1fr";
      return ph;
    }
    const grid4 = document.createElement("div");
    grid4.className = "preview-grid";
    for (let i = 0; i < 4; i++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      const item = items[i];
      if (item) tile.appendChild(makeImg(item));
      else tile.classList.add("empty");
      grid4.appendChild(tile);
    }
    return grid4;
  }

  function swfThumb() {
    const glyph = document.createElement("div");
    glyph.className = "play-glyph";
    return glyph;
  }

  function card(def, cat) {
    const items = (cat && cat.items) || [];
    const kind = cat ? cat.kind : def.key === "swf" ? "swf" : "image";
    const count = cat ? cat.count : 0;

    const a = document.createElement("a");
    a.className = "card cat-card";
    a.href = def.href;

    const thumb = document.createElement("div");
    thumb.className = "thumb" + (kind === "image" ? " image" : "");
    if (kind === "image") thumb.appendChild(imageThumb(items));
    else thumb.appendChild(swfThumb());

    const emoji = document.createElement("span");
    emoji.className = "cat-emoji";
    emoji.textContent = def.emoji;
    thumb.appendChild(emoji);

    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "title cat-name";
    title.textContent = def.label;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = count + " içerik · " + def.desc;
    meta.appendChild(title);
    meta.appendChild(sub);

    a.appendChild(thumb);
    a.appendChild(meta);
    return a;
  }

  function renderAll(cats) {
    const frag = document.createDocumentFragment();
    CATS.forEach((def) => frag.appendChild(card(def, cats[def.key])));
    grid.innerHTML = "";
    grid.appendChild(frag);
  }

  // "Rastgele!" — tüm arşivlerden rastgele bir içeriğe götürür.
  // Bu bir kullanıcı tıklaması olduğu için SWF'ler modalde sesle birlikte başlar.
  function setupRandom(cats) {
    const btn = document.getElementById("randomBtn");
    if (!btn) return;
    const pool = [];
    Object.keys(cats).forEach((key) => {
      const cat = cats[key];
      (cat.items || []).forEach((it) =>
        pool.push({ item: it, kind: cat.kind })
      );
    });
    if (!pool.length) {
      btn.disabled = true;
      return;
    }
    btn.addEventListener("click", function () {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.kind === "swf" && window.ArsivModal) {
        window.ArsivModal.openSwf(pick.item.file, pick.item.title);
      } else {
        location.href =
          (pick.kind === "swf" ? "player.html?file=" : "viewer.html?file=") +
          encodeURIComponent(pick.item.file);
      }
    });
  }

  getManifest()
    .then((m) => {
      const cats = (m && m.categories) || {};
      renderAll(cats);
      setupRandom(cats);
    })
    .catch(() => renderAll({}));
})();

