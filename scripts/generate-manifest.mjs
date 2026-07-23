#!/usr/bin/env node
/*
 * arsiv/ klasörünü tarar ve içindeki tüm .swf dosyalarını listeleyen
 * bir "swfs.json" manifesti üretir. GitHub Pages statik olduğu için
 * dizin listelemesi yapamaz; bu manifest sayesinde web sayfası hangi
 * SWF dosyalarının mevcut olduğunu bilir.
 *
 * Kullanım:  node scripts/generate-manifest.mjs
 *
 * İsteğe bağlı meta veri:  arsiv/metadata.json dosyası varsa, dosya
 * adına göre başlık/açıklama gibi alanlar buradan okunur. Örnek:
 *   { "oyun.swf": { "title": "Süper Oyun", "description": "..." } }
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ARSIV_DIR = path.join(ROOT, "arsiv");
const OUTPUT = path.join(ROOT, "swfs.json");

// Dosya adından okunabilir bir başlık üretir: "kirmizi_top-2.swf" -> "Kirmizi Top 2"
function titleFromFilename(name) {
  const base = name.replace(/\.swf$/i, "");
  const spaced = base.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.replace(/\b\w/g, (c) => c.toLocaleUpperCase("tr-TR"));
}

async function readMetadata() {
  try {
    const raw = await fs.readFile(path.join(ARSIV_DIR, "metadata.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// arsiv/ altındaki tüm .swf dosyalarını (alt klasörler dahil) bulur.
async function findSwfFiles(dir, baseDir) {
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
      results.push(...(await findSwfFiles(full, baseDir)));
    } else if (entry.isFile() && /\.swf$/i.test(entry.name)) {
      results.push(path.relative(baseDir, full));
    }
  }
  return results;
}

async function main() {
  const metadata = await readMetadata();
  const files = await findSwfFiles(ARSIV_DIR, ARSIV_DIR);
  files.sort((a, b) => a.localeCompare(b, "tr-TR"));

  const items = await Promise.all(
    files.map(async (rel) => {
      const posixRel = rel.split(path.sep).join("/");
      const meta = metadata[posixRel] || metadata[path.basename(posixRel)] || {};
      let size = 0;
      try {
        size = (await fs.stat(path.join(ARSIV_DIR, rel))).size;
      } catch {}
      return {
        // arsiv köküne göre yol (URL için de kullanılır)
        file: posixRel,
        // web sayfasında gösterilecek yol (repo köküne göre)
        path: "arsiv/" + posixRel,
        title: meta.title || titleFromFilename(path.basename(posixRel)),
        description: meta.description || "",
        size,
      };
    })
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  await fs.writeFile(OUTPUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`swfs.json olusturuldu: ${items.length} SWF dosyasi bulundu.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
