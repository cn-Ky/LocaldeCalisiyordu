# Localde Çalışıyordu — Native Masaüstü İstemcisi (C++ / Qt6)

Bu klasör, projenin **gerçek, derlenen bir native binary** olan masaüstü
istemcisidir. JavaScript çalışma zamanı, Chromium veya Node.js yoktur —
Qt6 (C++) arayüz katmanı, SQLite'a doğrudan bağlanır; ayrı bir backend
süreci yoktur.

## Kurulum (son kullanıcılar için)

İki farklı, çalıştırılmaya hazır paket üretiliyor:

**1) `.deb` paketi (Ubuntu/Debian)** — sistem paket yöneticisiyle kurulur,
uygulama menüsüne eklenir, gerekli Qt6/libsodium kütüphaneleri paket
bağımlılığı olarak otomatik kurulur:

```bash
sudo dpkg -i localde-calisiyordu_0.2.0_amd64.deb
# Eksik bağımlılık uyarısı çıkarsa:
sudo apt --fix-broken install
```

Kurulumdan sonra uygulama menüsünde "Localde Çalışıyordu" olarak
görünür, ya da terminalden `localde-desktop` ile başlatılabilir.
Kaldırmak için: `sudo dpkg -r localde-calisiyordu`.

**2) AppImage (herhangi bir Linux dağıtımı)** — kurulum gerektirmez, Qt6
kurulu olmasa bile çalışır (tüm bağımlılıklar dosyanın içine gömülü,
~28 MB). Sadece indirip çalıştırılabilir yapmak yeterli:

```bash
chmod +x LocaldeCalisiyordu-x86_64.AppImage
./LocaldeCalisiyordu-x86_64.AppImage
```

Her iki paket de bu depoda `desktop-cpp/build/` altında (derleme
sonrası) üretilir; hazır ikili dosyalar ayrıca paylaşılmış olabilir.

Her iki paket de **aynı native binary'yi** içerir — aralarındaki fark
yalnızca dağıtım şeklidir (sistem paketi vs. taşınabilir tek dosya).

## Neden bu şekilde tasarlandı

- **Tek süreç, ekstra runtime yok.** Web sürümündeki Express backend'i
  tamamen kalkıyor; `core/AuthService`, `core/ProjectService` gibi
  sınıflar iş mantığını doğrudan C++'ta, SQLite'a karşı çalıştırıyor.
- **Aynı veri modeli.** `core/Database.cpp`'deki şema,
  `backend/db.js`'teki tablolarla birebir aynı.
- **Argon2id (libsodium).** Web sürümü bcrypt kullanıyordu; burada
  libsodium'un `crypto_pwhash_str()` (Argon2id) fonksiyonu kullanılıyor
  — daha güncel, bellek-zorlu (memory-hard) bir varsayılan.
- **JWT/token yok.** Masaüstü istemcisi veritabanına doğrudan eriştiği
  için ağ sınırını aşan bir kimlik doğrulama token'ına gerek yok;
  oturum durumu yalnızca süreç belleğinde tutulur (`core/Session`).
- **Canlı önizleme (ileride) → QtWebEngine.** Kullanıcının yazdığı
  HTML/CSS/JS'i çalıştırıp göstermek doğası gereği bir tarayıcı render
  motoru gerektirir (bu, dilden bağımsız bir gerçektir). Qt
  ekosisteminde bunun native karşılığı `QtWebEngineWidgets`
  (Chromium tabanlı, Windows/macOS/Linux'ta çalışır) — WebKitGTK
  yalnızca GTK/Linux'a özgü olduğu için tercih edilmedi.

## Şu anki kapsam

**Faz 1 — Kimlik doğrulama ve proje akışı**
- [x] Kayıt / Giriş (Argon2id, aynı doğrulama kuralları)
- [x] Proje akışı: herkese açık + kendi projelerin listesi
- [x] Yeni proje oluşturma (varsayılan `index.html`/`style.css`/`script.js` dosyalarıyla)
- [x] Çıkış yap

**Faz 2 — Kod editörü ve dosya yönetimi**
- [x] Proje satırına çift tıklayınca editör penceresi açılır (sahibi değilseniz salt-okunur)
- [x] Dosya listesi (sol panel) + syntax highlighting'li editör (sağ panel)
- [x] HTML/CSS/JS için `QSyntaxHighlighter` tabanlı renklendirme (etiketler, seçiciler, anahtar kelimeler, dizeler, çok satırlı yorumlar)
- [x] Kaydet (Ctrl+S), Yeni Dosya, Dosyayı Sil
- [x] Kaydedilmemiş değişiklik varken dosya değiştirilirse uyarı

**Sıradaki fazlar**
- [ ] Canlı önizleme (QtWebEngine)
- [ ] Pull request / diff görünümü
- [ ] Mesajlaşma
- [ ] Takip sistemi, profil sayfaları

## Derleme

Gerekli paketler (Ubuntu/Debian):

```bash
sudo apt install qt6-base-dev qt6-base-dev-tools libqt6sql6-sqlite \
                  libsqlite3-dev libsodium-dev cmake pkg-config \
                  libgl1-mesa-dev
```

Derleme:

```bash
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
./localde-desktop
```

Veritabanı varsayılan olarak işletim sisteminin kalıcı veri klasörüne
yazılır (Linux'ta `~/.local/share/LocaldeCalisiyordu/...`). Test veya
geliştirme sırasında farklı bir konum kullanmak için:

```bash
LOCALDE_DB_PATH=/tmp/deneme.sqlite ./localde-desktop
```

## Paket üretme (.deb ve AppImage)

```bash
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr
make -j$(nproc)

# .deb paketi
cpack -G DEB
# -> localde-calisiyordu_<sürüm>_amd64.deb

# AppImage (linuxdeploy + linuxdeploy-plugin-qt gerekir)
DESTDIR=AppDir make install
QMAKE=/usr/bin/qmake6 EXTRA_QT_MODULES=Sql \
  linuxdeploy-x86_64.AppImage --appdir AppDir --plugin qt --output appimage \
  --icon-file=../packaging/linux/icons/icon-256.png \
  --desktop-file=AppDir/usr/share/applications/localde-calisiyordu.desktop
```

Her iki paket de gerçekten kurulup çalıştırılarak doğrulanmıştır: `.deb`
`dpkg -i` ile kurulmuş, uygulama menüsü/ikon/bağımlılıklar kontrol
edilmiş, kayıt ol → veritabanına yazma test edilmiş, ardından `dpkg -r`
ile temiz kaldırma da doğrulanmıştır. AppImage, hiçbir Qt paketi kurulu
olmayan bir ortamda çalıştırılıp aynı şekilde test edilmiştir.

## Test

Arayüz olmadan çekirdek servisleri (kayıt/giriş/proje kuralları)
doğrulayan bağımsız bir test hedefi mevcuttur:

```bash
cd build
make core_tests
LOCALDE_DB_PATH=/tmp/test.sqlite ./core_tests
```

Bu proje geliştirilirken hem bu test hedefi (26/26 test, auth + proje +
dosya CRUD kuralları) hem de gerçek arayüz (Xvfb + xdotool ile uçtan
uca) çalıştırılarak doğrulanmıştır: kayıt → giriş → proje listesi →
yeni proje oluşturma → projeyi açma → dosya içeriğini gerçekten
düzenleyip Ctrl+S ile kaydetme → yeni dosya ekleme tam döngüsü,
sonuçta oluşan `.sqlite` dosyası her adımda `sqlite3` CLI ile satır
satır kontrol edilerek teyit edilmiştir.

## Windows'ta elle derleme

Bu proje şu ana kadar yalnızca Linux'ta derlenip **gerçekten kurularak,
çalıştırılarak test edilmiştir**. Windows/macOS tarafı bu depodaki CI
iş akışı (`.github/workflows/release.yml`) ile otomatik derleniyor
olsa da, gerçek bir Windows/macOS runner'ında henüz doğrulanmadı — bu
yüzden aşağıdaki adımlar "bilinen doğru yöntem" olarak veriliyor, elle
test edilmiş değildir. Sorun yaşarsanız issue açın.

1. **Qt6 kur** — [Qt Online Installer](https://www.qt.io/download-qt-installer)
   ile "Qt 6.7 (veya üzeri) → MSVC 2019/2022 64-bit" bileşenini seçin.
2. **Visual Studio Build Tools** (MSVC derleyicisi) kurulu olmalı —
   "Desktop development with C++" iş yükü yeterli.
3. **libsodium** — [vcpkg](https://github.com/microsoft/vcpkg) ile:
   ```powershell
   git clone https://github.com/microsoft/vcpkg
   .\vcpkg\bootstrap-vcpkg.bat
   .\vcpkg\vcpkg.exe install libsodium:x64-windows
   ```
4. **Derle** (Qt kurulum yolunuza göre `CMAKE_PREFIX_PATH`'i güncelleyin):
   ```powershell
   mkdir build; cd build
   cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release `
     -DCMAKE_PREFIX_PATH="C:\Qt\6.7.0\msvc2019_64" `
     -DCMAKE_TOOLCHAIN_FILE="C:\path\to\vcpkg\scripts\buildsystems\vcpkg.cmake" `
     -DVCPKG_TARGET_TRIPLET=x64-windows
   ninja
   ```
5. **Qt DLL'lerini topla** (dağıtılabilir hale getirmek için):
   ```powershell
   windeployqt --release localde-desktop.exe
   copy C:\path\to\vcpkg\installed\x64-windows\bin\libsodium.dll .
   ```
   Bu klasörü olduğu gibi zip'leyip paylaşabilirsiniz, ya da yerel
   olarak `cpack -G NSIS` ile bir kurulum sihirbazı (.exe installer)
   üretmeyi deneyebilirsiniz (proje NSIS için önceden yapılandırılmış
   durumda, `packaging/windows/` altında ikon dahil — ama bu adım da
   henüz gerçek bir Windows makinesinde test edilmedi).

## CI/CD — Otomatik çok-platformlu derleme

`.github/workflows/release.yml`, her `push`/`pull request`'te Linux
(.deb + AppImage), Windows (taşınabilir .zip) ve macOS (.dmg) paketlerini
otomatik olarak derler ve GitHub Actions'ın "Artifacts" bölümünden
indirilebilir hale getirir. `v1.0.0` gibi bir sürüm etiketi (`git tag
v1.0.0 && git push --tags`) push'landığında ise üç paket otomatik olarak
bir GitHub Release'e eklenir.

**Doğrulama durumu:** Linux işi (`build-linux`) bu depoda elle
çalıştırılan adımların birebir aktarılmış hali olduğundan güvenilir.
Windows ve macOS işleri ise standart, yaygın kullanılan araçlarla
(`jurplel/install-qt-action`, `windeployqt`, `macdeployqt`, vcpkg)
yazıldı ama gerçek runner'da hiç çalıştırılmadı — depoyu GitHub'a
push'ladıktan sonra Actions sekmesinden ilk çalıştırmayı kontrol etmenizi
öneririm.

## Windows / macOS (özet)

CMake yapılandırması platformdan bağımsızdır ve artık hem Windows
(vcpkg + NSIS) hem macOS (Homebrew + macdeployqt) için özel olarak
ayarlanmış durumda — yukarıdaki CI iş akışına veya elle derleme
adımlarına bakın.
