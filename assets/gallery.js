// Kategori galerisi: manifest.json'dan ilgili kategoriyi okur, kartları çizer.
// Kategori, <body data-category="swf|gif|foto"> ile belirlenir.
(function () {
  "use strict";

  const category = document.body.dataset.category;
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const errorBox = document.getElementById("error");
  const countPill = document.getElementById("count");
  const search = document.getElementById("search");

  let items = [];
  let kind = "swf";

  function formatSize(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0,
      n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function extOf(file) {
    const m = /\.([^.]+)$/.exec(file);
    return m ? m[1].toUpperCase() : "";
  }

  function cardFor(item) {
    const a = document.createElement("a");
    a.className = "card";
    const isImage = kind === "image";
    a.href =
      (isImage ? "viewer.html?file=" : "player.html?file=") +
      encodeURIComponent(item.file);

    const thumb = document.createElement("div");
    thumb.className = "thumb" + (isImage ? " image" : "");

    if (isImage) {
      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = item.title;
      img.src = item.path;
      thumb.appendChild(img);
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = extOf(item.file);
      thumb.appendChild(badge);
    } else {
      const glyph = document.createElement("div");
      glyph.className = "play-glyph";
      thumb.appendChild(glyph);
    }

    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title;
    const sub = document.createElement("div");
    sub.className = "sub";
    const size = formatSize(item.size);
    const label = extOf(item.file);
    sub.textContent = size ? `${label} · ${size}` : label;

    meta.appendChild(title);
    meta.appendChild(sub);
    a.appendChild(thumb);
    a.appendChild(meta);
    return a;
  }

  function render(list) {
    grid.innerHTML = "";
    if (!items.length) {
      grid.hidden = true;
      empty.hidden = false;
      countPill.textContent = "";
      return;
    }
    empty.hidden = true;
    grid.hidden = false;
    const frag = document.createDocumentFragment();
    list.forEach((item) => frag.appendChild(cardFor(item)));
    grid.appendChild(frag);
    countPill.textContent =
      list.length === items.length
        ? `${items.length} içerik`
        : `${list.length} / ${items.length} içerik`;
  }

  function applyFilter() {
    const q = search.value.trim().toLocaleLowerCase("tr-TR");
    if (!q) return render(items);
    const filtered = items.filter(
      (it) =>
        it.title.toLocaleLowerCase("tr-TR").includes(q) ||
        it.file.toLocaleLowerCase("tr-TR").includes(q)
    );
    render(filtered);
  }

  fetch("manifest.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("manifest");
      return r.json();
    })
    .then((data) => {
      const cat = data.categories && data.categories[category];
      items = cat && Array.isArray(cat.items) ? cat.items : [];
      kind = cat ? cat.kind : "swf";
      render(items);
      search.addEventListener("input", applyFilter);
    })
    .catch(() => {
      grid.hidden = true;
      empty.hidden = true;
      errorBox.hidden = false;
    });
})();
