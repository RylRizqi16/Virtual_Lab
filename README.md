# Virtual Lab Lanjutan

Virtual Lab Fisika dengan autentikasi pengguna dan penyimpanan progres eksperimen berbasis database. Proyek dipisahkan menjadi frontend statis dan backend API sehingga mudah di-deploy ke layanan berbeda (misalnya Netlify/GitHub Pages untuk frontend dan Vercel/AWS Lambda untuk backend).

## Struktur Proyek

```
Virtual_Lab_Lanjutan/
├── frontend/
│   ├── index.html
│   ├── pendulum.html
│   ├── freefall.html
│   ├── projectile.html
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

Frontend bersifat statis. Saat pengembangan lokal, bisa dijalankan dengan server static (contoh `npx serve`) atau langsung melalui ekstensi Live Server di VS Code. Pastikan variabel JavaScript `window.__VLAB_API_BASE__` diarahkan ke origin backend bila berbeda host.

### Menyiapkan Neon sebagai Database

1. Buat proyek baru di [Neon](https://neon.tech) dan catat connection string Postgres yang disediakan.
2. Tambahkan connection string tersebut ke file `.env` lokal sebagai `DATABASE_URL`.
3. Jalankan `npm install` di folder `backend/` untuk menarik dependensi `pg`.
4. Di Vercel, tambahkan variable lingkungan `DATABASE_URL` dengan nilai connection string yang sama (gunakan opsi `Encrypted`).
5. Jika ingin memulai dengan tabel kosong, tidak perlu menjalankan migrasi manual—`backend/config/database.js` akan membuat tabel `users` dan `user_progress` secara otomatis.

## Deployment Rekomendasi

### Frontend (Netlify / GitHub Pages)

1. Deploy folder `frontend/` sebagai situs statis.
2. Jika backend berada di domain berbeda, tambahkan sebelum memuat `script.js`:
   ```html
   <script>
       window.__VLAB_API_BASE__ = 'https://nama-backend.vercel.app/api';
   </script>
   <script src="script.js" defer></script>
   ```

### Backend (Vercel)

1. Deploy folder `backend/` sebagai Project Node.js di Vercel.
2. `backend/api/index.js` sudah disiapkan agar bertindak sebagai handler serverless.
3. Pastikan `vercel.json` di root repository tersedia (lihat di bawah).
4. Set environment variable melalui Vercel Dashboard:
   - `JWT_SECRET`
   - `SALT_ROUNDS` (opsional)
  - `CLIENT_ORIGIN` diarahkan ke domain frontend.
  - `DATABASE_URL` (Neon / layanan Postgres lain, gunakan string koneksi dengan SSL).

### Konfigurasi `vercel.json`

File `vercel.json` mengarahkan semua request `/api/*` ke backend:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/backend/api/index.js" }
  ]
}
```

Frontend dapat tetap di-host di Netlify/GitHub Pages. Jika ingin men-deploy frontend di Vercel juga, buat proyek Vercel lain yang menargetkan folder `frontend/` dan atur build command ke `null` (deploy statis).

## Catatan Penting

- Pastikan `DATABASE_URL` mengarah ke instance Postgres yang mendukung SSL (Neon, Supabase, dsb.). Koneksi lokal tanpa SSL juga didukung selama host menggunakan `localhost`.
- Biasakan mengaktifkan HTTPS/SSL agar token JWT aman saat transmisi.
- Uji setiap halaman setelah build untuk memastikan pemanggilan API lintas-origin berhasil.
