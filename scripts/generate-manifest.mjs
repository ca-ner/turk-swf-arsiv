#!/usr/bin/env node
/*
 * arsiv/ altındaki kategori klasörlerini (swf, gif, foto) tarar ve tek bir
 * "manifest.json" dosyası üretir. GitHub Pages statik olduğu için dizin
 * listeleyemez; sayfalar hangi içeriklerin mevcut olduğunu bu manifestten
 * öğrenir.
 *
 * Kullanım:  node scripts/generate-manifest.mjs
 *
 * İsteğe bağlı meta veri: her kategori klasöründe bir "metadata.json" olabilir.
 *   arsiv/swf/metadata.json  ->  { "dosya.swf": { "title": "...", "description": "..." } }
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARSIV_DIR = path.join(ROOT, "arsiv");
const OUTPUT = path.join(ROOT, "manifest.json");
// Ayrıca bir JS sürümü üretiriz: <script> ile yüklendiği için file:// üzerinde
// ve manifesti henüz üretmemiş dağıtımlarda da (fetch gerekmeden) çalışır.
const OUTPUT_JS = path.join(ROOT, "assets", "manifest.js");

// Kategoriler ve kabul ettikleri uzantılar
const CATEGORIES = [
  { key: "swf", label: "SWF", kind: "swf", exts: [".swf"] },
  { key: "gif", label: "GIF", kind: "image", exts: [".gif"] },
  {
    key: "foto",
    label: "Foto",
    kind: "image",
    exts: [".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp"],
  },
  {
    key: "forum_thg_tr",
    label: "Forum",
    kind: "mht",
    exts: [".mht", ".mhtml"],
  },
];

// Dosya adından okunabilir başlık: "kirmizi_top-2.swf" -> "Kirmizi Top 2"
// (Türkçe karakterleri bozmadan her kelimenin ilk harfini büyütür.)
function titleFromFilename(name) {
  const base = name.replace(/\.[^.]+$/i, "");
  const spaced = base.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced
    .split(" ")
    .map((w) => (w ? w[0].toLocaleUpperCase("tr-TR") + w.slice(1) : w))
    .join(" ");
}

async function readMetadata(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, "metadata.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Bir klasördeki (alt klasörler dahil) belirtilen uzantılı dosyaları bulur.
async function findFiles(dir, baseDir, exts) {
  const results = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findFiles(full, baseDir, exts)));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) results.push(path.relative(baseDir, full));
    }
  }
  return results;
}

async function main() {
  const manifest = { generatedAt: new Date().toISOString(), categories: {} };
  let total = 0;

  for (const cat of CATEGORIES) {
    const catDir = path.join(ARSIV_DIR, cat.key);
    const metadata = await readMetadata(catDir);
    const files = await findFiles(catDir, catDir, cat.exts);
    files.sort((a, b) => a.localeCompare(b, "tr-TR"));

    const items = await Promise.all(
      files.map(async (rel) => {
        const posixRel = rel.split(path.sep).join("/");
        const meta =
          metadata[posixRel] || metadata[path.basename(posixRel)] || {};
        let size = 0;
        try {
          size = (await fs.stat(path.join(catDir, rel))).size;
        } catch {}
        return {
          // arsiv köküne göre yol: "swf/dosya.swf"
          file: cat.key + "/" + posixRel,
          // repo köküne göre yol: "arsiv/swf/dosya.swf"
          path: "arsiv/" + cat.key + "/" + posixRel,
          title: meta.title || titleFromFilename(path.basename(posixRel)),
          description: meta.description || "",
          size,
        };
      })
    );

    manifest.categories[cat.key] = {
      key: cat.key,
      label: cat.label,
      kind: cat.kind,
      count: items.length,
      items,
    };
    total += items.length;
    console.log(`  ${cat.key.padEnd(5)}: ${items.length} dosya`);
  }

  const json = JSON.stringify(manifest, null, 2);
  await fs.writeFile(OUTPUT, json + "\n", "utf8");
  await fs.writeFile(
    OUTPUT_JS,
    "// Otomatik üretildi — elle düzenlemeyin. Kaynak: scripts/generate-manifest.mjs\n" +
      "window.ARSIV_MANIFEST = " +
      json +
      ";\n",
    "utf8"
  );
  console.log(`manifest.json + assets/manifest.js olusturuldu — toplam ${total} icerik.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
