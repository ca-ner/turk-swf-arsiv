# Caner ile Türk İnternet Arkeolojisi ⚡

Eski Türk internet kültürünün dijital arşivi. **Flash (SWF)** animasyonları,
**GIF**'ler ve **fotoğraflar** — hepsi tarayıcıda, herhangi bir eklenti veya
arka planda çalışan bir sunucu gerektirmeden. GitHub Pages üzerinde olduğu gibi
statik olarak yayınlanabilir.

SWF içerikleri için oynatma motoru olarak
[**Ruffle**](https://ruffle.rs) (WebAssembly tabanlı açık kaynak Flash Player
emülatörü) kullanılır ve `ruffle/` klasöründe **kendi sunucumuzda barındırılır**
— harici bir CDN'e bağımlı değildir.

## Yapı

Site iki katmanlıdır:

1. **Ana sayfa** (`index.html`) — kategori seçimi: **SWF**, **GIF**, **Foto**, **Forum**.
2. **Kategori galerileri** — her kategori kendi galerisine sahiptir ve içeriği
   ayrı bir klasörden okur.

```
index.html          Ana sayfa (kategori seçimi)
swf.html            SWF galerisi        →  arsiv/swf/
gif.html            GIF galerisi        →  arsiv/gif/
foto.html           Foto galerisi       →  arsiv/foto/
forum.html          Forum galerisi      →  arsiv/forum_thg_tr/
player.html         SWF oynatıcı (Ruffle)   ?file=swf/<dosya>
viewer.html         GIF/Foto görüntüleyici  ?file=gif|foto/<dosya>
mht.html            Forum (.mht) görüntüleyici  ?file=forum_thg_tr/<dosya>
assets/             CSS ve JavaScript
ruffle/             Kendi sunucumuzda barındırılan Ruffle motoru (WASM)
arsiv/
  ├── swf/          .swf dosyaları
  ├── gif/          .gif dosyaları
  ├── foto/         .jpg, .jpeg, .png, .webp, .avif, .bmp
  └── forum_thg_tr/ .mht / .mhtml (arşivlenmiş forum sayfaları)
manifest.json       Otomatik üretilen içerik listesi (tüm kategoriler)
assets/manifest.js  Aynı listenin <script> ile gömülen sürümü (otomatik)
scripts/            Manifest üreticisi
.github/workflows/  GitHub Pages dağıtım iş akışı
```

GitHub Pages statik olduğu için dizin listeleyemez. Bu yüzden `arsiv/` altındaki
kategori klasörleri taranarak tek bir **`manifest.json`** (ve `<script>` ile
gömülen ikizi **`assets/manifest.js`**) üretilir; sayfalar hangi içeriklerin
mevcut olduğunu buradan öğrenir. `manifest.js` sayesinde site, `fetch`
kısıtlaması olan yerel `file://` açılışlarında bile çalışır. Manifest, her
`push`'ta GitHub Actions tarafından otomatik yeniden oluşturulur.

## Özellikler

- 🗂️ **Kategoriler** — SWF, GIF ve Foto ayrı klasörlerde ve ayrı galerilerde.
- 📼 **Eklentisiz Flash** — SWF'ler Ruffle ile, döngüde oynatılır. Galeride bir
  içeriğe tıklandığında sayfa içi oynatıcıda (modal) açılır; bu tıklama bir
  kullanıcı etkileşimi sayıldığı için **ses de anında başlar** (tarayıcılar
  sesli otomatik oynatmayı yalnızca bir etkileşimden sonra izin verir).
- 🎲 **Rastgele!** — ana sayfadaki düğme, tüm arşivlerden rastgele bir içeriği açar.
- ⌨️ **Ok tuşlarıyla gezinme** — bir içeriği izlerken **→** sonraki, **←** önceki
  içeriğe geçer (aynı kategori içinde; başa/sona gelince döner). SWF modalinde,
  GIF/Foto görüntüleyicisinde ve paylaşılan oynatıcı sayfasında geçerlidir.
- 🎞️ **GIF & Foto** — görseller tam sayfa görüntülenir; GIF'ler doğal olarak döner.
- 💬 **Forum (.mht)** — arşivlenmiş forum sayfaları (MHTML). Tarayıcılar `.mht`
  dosyalarını doğrudan açmadığı için içerik istemci tarafında çözümlenir (MIME
  multipart parçalara ayrılıp gömülü görsel/CSS `data:` URI olarak gömülür) ve
  altta ayrı, sandbox'lı bir çerçevede (iframe) gösterilir.
- 📱 **Responsive & mobil uyumlu** — içerik adı en üstte, içerik tam sayfa altta.
- 🔗 **Bağımsız paylaşım** — her içeriğin kendi bağlantısı vardır, tek tek
  paylaşılabilir (`player.html?file=…` veya `viewer.html?file=…`).
- 🔎 **Arama** — her galeride içerik arama.
- 🤖 **Otomatik liste** — ilgili klasöre dosya ekleyip gönderdiğinizde galeri
  otomatik güncellenir.

## Yeni içerik ekleme

1. Dosyaları uygun klasöre koyun:
   - Flash → `arsiv/swf/`
   - GIF → `arsiv/gif/`
   - Fotoğraf → `arsiv/foto/`
2. Değişiklikleri commit'leyip `push`'layın.
3. GitHub Actions manifesti (`manifest.json`) yeniden üretir ve siteyi
   yayınlar. Galeriler güncellenir.

### (İsteğe bağlı) Başlık ve açıklama

Dosya adından otomatik bir başlık üretilir (Türkçe karakterler korunur; ör.
`bahçeli şile.swf` → "Bahçeli Şile"). Daha özel başlıklar için ilgili kategori
klasörüne bir `metadata.json` ekleyebilirsiniz:

```jsonc
// arsiv/swf/metadata.json
{
  "bahçeli şile.swf": {
    "title": "Bahçeli & Şile",
    "description": "Klasik bir Flash animasyonu."
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
# Yeni dosya eklediyseniz manifesti üretin
node scripts/generate-manifest.mjs

# Basit bir sunucu başlatın
python3 -m http.server 8099
# Tarayıcıda: http://127.0.0.1:8099/
```

## Örnek içerikler

`arsiv/gif/` ve `arsiv/foto/` klasörlerinde birer örnek dosya (`ornek_*`)
bulunur; bunlar galerilerin ve görüntüleyicinin çalıştığını göstermek içindir,
istediğiniz zaman silebilirsiniz.

## Lisans / atıf

- Ruffle: MIT / Apache-2.0 (bkz. `ruffle/LICENSE_MIT`, `ruffle/LICENSE_APACHE`).
- Arşivdeki içeriklerin telif hakları ilgili sahiplerine aittir.
