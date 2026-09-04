# Localde Çalışıyordu

Localde Çalışıyordu, kullanıcıların HTML, CSS ve JavaScript kodlarını yazıp çalıştırabildiği, projelerini paylaşabildiği ve diğer geliştiricilerle iş birliği yapabildiği bir yazılım platformu projesidir. CodePen benzeri bir kod editörü deneyimi sunarken, aynı zamanda proje paylaşımı, pull request sistemi, profil yönetimi ve mesajlaşma gibi sosyal yazılım geliştirme özelliklerini bir araya getirir.

## https://localde-calisiyordu.vercel.app

## Proje Hakkında

Bu proje, geliştiricilerin:
- Kod yazıp doğrudan önizleyebildiği
- Projelerini yayınlayıp paylaşabildiği
- Başka kullanıcıların projelerine pull request açabildiği
- Profil, takip ve mesajlaşma özellikleriyle bir topluluk deneyimi yaşayabildiği

bir ortam oluşturmayı hedefler.

## Kullanılan Teknolojiler

### Frontend
- React
- Vite
- React Router DOM
- CodeMirror
- Axios
- Diff
- CSS ve kullanıcı arayüz tasarımı

### Backend
- Node.js
- Express.js
- JWT (kimlik doğrulama)
- bcryptjs (şifre güvenliği)
- multer (dosya yükleme)
- PostgreSQL
- CORS

### Araçlar
- Concurrently
- npm tabanlı kurulum ve geliştirme akışı

## Özellikler

- HTML, CSS ve JavaScript editörü
- Canlı önizleme deneyimi
- Proje oluşturma ve paylaşma
- Pull request sistemi
- Kullanıcı profilleri ve mesajlaşma
- Public/Private proje görünürlüğü

## Kurulum

Projeyi çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

```bash
npm run install:all
npm run dev
```

### Kalıcı veritabanı

Backend artık geçici SQLite dosyası kullanmaz; PostgreSQL bağlantısı olmadan başlamaz. Yerel geliştirmede `backend/.env` içine bir PostgreSQL bağlantısı ekleyin:

```env
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/localde_calisiyordu
JWT_SECRET=yerel-gelistirme-gizli-anahtari
```

Render kullanıyorsanız `render.yaml`, web servisine kalıcı PostgreSQL veritabanının `DATABASE_URL` bağlantısını otomatik olarak bağlar. Uygulama ilk açılışta tabloları ve indeksleri oluşturur.

## Amaç

Bu proje, kod paylaşımı ve geliştirici iş birliği deneyimini tek bir platformda birleştirerek, daha interaktif ve sosyal bir yazılım geliştirme ortamı sunmayı amaçlamaktadır.
