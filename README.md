# SWF Arşivi ⚡

Eski **Flash (SWF)** içeriklerini, herhangi bir eklenti veya arka planda çalışan
bir sunucu gerektirmeden, doğrudan tarayıcıda yeniden oynatan **statik** bir web
arşivi. GitHub Pages üzerinde olduğu gibi yayınlanabilir.

Oynatma motoru olarak [**Ruffle**](https://ruffle.rs) (WebAssembly tabanlı açık
kaynak Flash Player emülatörü) kullanılır ve `ruffle/` klasöründe **kendi
sunucumuzda barındırılır** — yani harici bir CDN'e bağımlı değildir, tamamen
kendi kendine yeterlidir.

## Özellikler

- 📼 **Eklentisiz oynatma** — modern tarayıcılarda, masaüstü ve mobilde çalışır.
- 🔁 **Döngü** — Flash ana zaman çizelgesi varsayılan olarak döngüde döner;
  ayrıca "Baştan" düğmesiyle içeriği istediğiniz an yeniden başlatabilirsiniz.
- 📱 **Responsive & mobil uyumlu** — içerik adı en üstte, içerik tam sayfa altta.
- 🔗 **Bağımsız paylaşım** — her SWF'in kendi bağlantısı vardır
  (`player.html?file=...`), tek tek paylaşılabilir.
- 🗂️ **Otomatik liste** — `arsiv/` klasörüne dosya ekleyip gönderdiğinizde
  liste (galeri) otomatik güncellenir.

## Nasıl çalışır?

```
index.html          Galeri — tüm SWF'lerin listesi
player.html         Tekil oynatıcı (?file=<dosya> ile)
assets/             CSS ve JavaScript
ruffle/             Kendi sunucumuzda barındırılan Ruffle motoru (WASM)
arsiv/              SWF dosyalarının bulunduğu klasör
swfs.json           Otomatik üretilen içerik listesi (manifest)
scripts/            Manifest üreticisi
.github/workflows/  GitHub Pages dağıtım iş akışı
```

GitHub Pages statik olduğu için dizin listeleyemez. Bu yüzden `arsiv/` klasörü
taranarak bir **`swfs.json`** manifesti üretilir; sayfa hangi SWF'lerin mevcut
olduğunu bu dosyadan öğrenir. Manifest, her `push`'ta GitHub Actions tarafından
otomatik yeniden oluşturulur.

## Yeni SWF ekleme

1. `.swf` dosyalarını `arsiv/` klasörüne koyun (alt klasörler de desteklenir).
2. Değişiklikleri commit'leyip `push`'layın.
3. GitHub Actions manifesti yeniden üretir ve siteyi yayınlar. Galeri güncellenir.

### (İsteğe bağlı) Başlık ve açıklama

Dosya adından otomatik bir başlık üretilir (ör. `kirmizi_top.swf` → "Kirmizi Top").
Daha güzel başlıklar için `arsiv/metadata.json` ekleyebilirsiniz:

```json
{
  "kirmizi_top.swf": {
    "title": "Kırmızı Top Oyunu",
    "description": "2007 yapımı klasik bir mini oyun."
  }
}
```

## GitHub Pages'i etkinleştirme

1. Depoyu GitHub'a gönderin.
2. **Settings → Pages → Build and deployment → Source** kısmını
   **"GitHub Actions"** olarak ayarlayın.
3. `main` dalına yapılan her `push`'ta site otomatik yayınlanır. (İş akışını
   **Actions** sekmesinden elle de tetikleyebilirsiniz — *Run workflow*.)

## Yerelde çalıştırma / önizleme

`file://` üzerinden değil, basit bir HTTP sunucusuyla açın (WASM'ın doğru MIME
tipiyle sunulması gerekir):

```bash
# Manifesti üret (yeni dosya eklediyseniz)
node scripts/generate-manifest.mjs

# Basit bir sunucu başlatın
python3 -m http.server 8099
# Tarayıcıda: http://127.0.0.1:8099/
```

## Lisans / atıf

- Ruffle: MIT / Apache-2.0 (bkz. `ruffle/LICENSE_MIT`, `ruffle/LICENSE_APACHE`).
- Arşivdeki SWF içeriklerinin telif hakları ilgili sahiplerine aittir.
