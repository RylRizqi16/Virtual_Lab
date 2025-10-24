# SimuLab

SimuLab adalah laboratorium fisika virtual dengan autentikasi pengguna dan penyimpanan progres eksperimen berbasis database. Proyek dipisahkan menjadi frontend statis dan backend API sehingga mudah di-deploy ke layanan berbeda (misalnya Netlify/GitHub Pages untuk frontend dan Vercel/AWS Lambda untuk backend).

## Struktur Proyek

```
SimuLab/
├── frontend/
│   ├── index.html
│   ├── pendulum.html
│   ├── freefall.html
│   ├── projectile.html
│   ├── profile.html
│   ├── style.css
│   ├── script.js
│   └── assets/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── api/index.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── progressController.js
│   ├── config/
│   │   ├── database.js
│   │   └── env.js
└── README.md
```

## Fitur Baru

- **Autentikasi Pengguna** menggunakan email & kata sandi (JWT + bcrypt).
- **Penyimpanan Progres Eksperimen** ke database PostgreSQL terkelola (mis. Neon) yang siap produksi.
- **UI Multi-Halaman**: landing page terpisah dari masing-masing simulasi (Bandul, Jatuh Bebas, Gerak Parabola).
- **Sinkronisasi Cloud**: hasil eksperimen bandul otomatis dikirim ke backend saat pengukuran selesai.
- **Single Sign-On Opsional**: login cukup sekali di landing page SimuLab untuk sinkronisasi lintas modul, sementara tamu tetap bisa langsung menjalankan simulasi.
- **Halaman Profil**: menyajikan data akun, riwayat simulasi, statistik quiz, serta form pembaruan biodata pengguna.

## Menjalankan Secara Lokal

### 1. Backend

```powershell
cd backend
npm install
npm run dev
```

Buat file `.env` di `backend/` untuk konfigurasi lokal:

```
PORT=3000
JWT_SECRET=ubah-rahasia-anda
CLIENT_ORIGIN=http://localhost:5173
SALT_ROUNDS=10
DATABASE_URL=postgres://user:password@host/dbname
```

### 2. Frontend

Frontend bersifat statis. Saat pengembangan lokal, bisa dijalankan dengan server static (contoh `npx serve`) atau langsung melalui ekstensi Live Server di VS Code. Pastikan variabel JavaScript `window.__SIMULAB_API_BASE__` diarahkan ke origin backend bila berbeda host (variabel lama `window.__VLAB_API_BASE__` masih didukung sebagai fallback).

### Menyiapkan Neon sebagai Database

1. Buat proyek baru di [Neon](https://neon.tech) dan catat connection string Postgres yang disediakan.
2. Tambahkan connection string tersebut ke file `.env` lokal sebagai `DATABASE_URL`.
3. Jalankan `npm install` di folder `backend/` untuk menarik dependensi `pg`.
4. Di Vercel, tambahkan variable lingkungan `DATABASE_URL` dengan nilai connection string yang sama (gunakan opsi `Encrypted`).
5. Jika ingin memulai dengan tabel kosong, tidak perlu menjalankan migrasi manual—`backend/config/database.js` akan membuat tabel `users` dan `user_progress` secara otomatis.

## Deployment ke Vercel + Neon

Konfigurasi repo ini memungkinkan frontend dan backend dirilis dalam satu proyek Vercel, sementara database dijalankan di Neon. Berikut alur lengkapnya.

### 1. Siapkan database di Neon

1. Masuk ke [Neon](https://neon.tech) dan buat project baru.
2. Salin connection string Postgres (formatnya `postgres://user:password@host/dbname`).
3. Aktifkan opsi `Require SSL` agar koneksi aman; gunakan connection string SSL-ready jika disediakan.
4. Opsional: buat role/database terpisah untuk staging dan production agar pengelolaan lebih mudah.

### 2. Impor repository ke Vercel

1. Klik **New Project** di dashboard Vercel, pilih repository GitHub ini.
2. Biarkan `Framework Preset` kosong (proyek multi-build). Vercel akan membaca `vercel.json` di root.
3. Gunakan Node.js 18+ (default Vercel saat ini sudah sesuai).

### 3. Atur environment variables

Tambahkan variabel-variabel berikut di tab **Settings → Environment Variables** untuk setiap environment (Production / Preview / Development):

- `DATABASE_URL` → connection string dari Neon.
- `JWT_SECRET` → rahasia untuk penandatanganan token.
- `SALT_ROUNDS` → jumlah salt bcrypt (default 10 bila dikosongkan di kode).
- `CLIENT_ORIGIN` → origin frontend (contoh `https://simulab.vercel.app`).

Vercel akan menanam variabel ini untuk fungsi serverless di `backend/api/index.js`.

### 4. Deploy

1. Jalankan build pertama langsung dari Vercel; `vercel.json` memastikan backend dan frontend ter-deploy bersama.
2. Setelah deploy, akses domain Vercel Anda. Frontend otomatis tersedia di path root (`/`), sementara endpoint API dapat diakses melalui `/api/*`.
3. Karena frontend dan backend berada di domain yang sama, `script.js` otomatis menggunakan `/api` tanpa perlu mengatur `window.__SIMULAB_API_BASE__`. Jika suatu saat backend terpisah domain, override variabel tersebut di tag `<script>` sebelum `script.js`.

### Konfigurasi `vercel.json`

`vercel.json` di root repo sudah men-define build dan routing berikut:

```json
{
  "builds": [
    { "src": "backend/api/index.js", "use": "@vercel/node", "config": { "includeFiles": "backend/**" } },
    { "src": "frontend/**", "use": "@vercel/static" }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/api/index.js" }
  ],
  "routes": [
    { "src": "/", "dest": "/frontend/index.html" },
    { "src": "/(.*)", "dest": "/frontend/$1" }
  ]
}
```

Anda bisa menyesuaikan file ini bila perlu (mis. menambahkan headers untuk cache, route khusus, dsb.).

## Catatan Penting

- Pastikan `DATABASE_URL` mengarah ke instance Postgres yang mendukung SSL (Neon, Supabase, dsb.). Koneksi lokal tanpa SSL juga didukung selama host menggunakan `localhost`.
- Biasakan mengaktifkan HTTPS/SSL agar token JWT aman saat transmisi.
- Uji setiap halaman setelah build untuk memastikan pemanggilan API lintas-origin berhasil.
