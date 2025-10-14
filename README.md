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
│   └── data/ (dibuat otomatis saat runtime)
└── README.md
```

## Fitur Baru

- **Autentikasi Pengguna** menggunakan email & kata sandi (JWT + bcrypt).
- **Penyimpanan Progres Eksperimen** ke database SQLite (bisa diganti ke layanan lain).
- **UI Multi-Halaman**: landing page terpisah dari masing-masing simulasi (Bandul, Jatuh Bebas, Gerak Parabola).
- **Sinkronisasi Cloud**: hasil eksperimen bandul otomatis dikirim ke backend saat pengukuran selesai.

## Menjalankan Secara Lokal

### 1. Backend

```powershell
cd backend
npm install
npm run dev
```

Buat file `.env` (opsional) di `backend/` bila ingin mengubah konfigurasi:

```
PORT=3000
JWT_SECRET=ubah-rahasia-anda
CLIENT_ORIGIN=http://localhost:5173
SALT_ROUNDS=10
```

### 2. Frontend

Frontend bersifat statis. Saat pengembangan lokal, bisa dijalankan dengan server static (contoh `npx serve`) atau langsung melalui ekstensi Live Server di VS Code. Pastikan variabel JavaScript `window.__VLAB_API_BASE__` diarahkan ke origin backend bila berbeda host.

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

- SQLite bersifat file-based; pada Vercel (serverless) penyimpanan tidak persisten antar instans. Untuk produksi gunakan database terkelola (Supabase, Neon, PlanetScale, dsb.) dan modifikasi `backend/config/database.js` agar memakai koneksi tersebut.
- Biasakan mengaktifkan HTTPS/SSL agar token JWT aman saat transmisi.
- Uji setiap halaman setelah build untuk memastikan pemanggilan API lintas-origin berhasil.
