# SimuLab - Virtual Physics Laboratory

SimuLab adalah laboratorium fisika virtual interaktif yang memungkinkan pengguna untuk belajar dan bereksperimen dengan konsep-konsep fisika dasar melalui simulasi visual. Proyek ini tersedia dalam dua platform: **Web Application** dan **Mobile Application (React Native/Expo)**.

## Tentang Proyek

SimuLab dirancang untuk membantu mahasiswa dan pelajar memahami konsep fisika melalui pendekatan interaktif. Pengguna dapat menjalankan simulasi fisika, mengubah parameter eksperimen secara real-time, dan menguji pemahaman mereka melalui sistem quiz yang terintegrasi.

### Tujuan Utama
- Menyediakan alat pembelajaran fisika yang interaktif dan visual
- Memungkinkan eksperimen tanpa risiko dan tanpa keterbatasan alat laboratorium fisik
- Melacak progres belajar pengguna melalui sistem autentikasi dan penyimpanan cloud
- Menguji pemahaman konsep melalui quiz yang disesuaikan dengan setiap simulasi

---

## Fitur Utama

### Simulasi Fisika
| Simulasi | Deskripsi | Parameter yang Dapat Diubah |
|----------|-----------|----------------------------|
| **Bandul Sederhana** | Simulasi osilasi bandul dengan perhitungan periode | Panjang tali, sudut awal, gravitasi |
| **Gerak Jatuh Bebas** | Simulasi benda jatuh bebas dari ketinggian tertentu | Ketinggian awal, gravitasi |
| **Gerak Parabola** | Simulasi proyektil dengan lintasan parabola | Kecepatan awal, sudut tembak, gravitasi |

### Sistem Autentikasi
- **Registrasi & Login** dengan email dan password
- **JWT Token** untuk keamanan sesi
- **Password Hashing** menggunakan bcrypt
- **Guest Mode**: Tamu tetap bisa mencoba simulasi tanpa login

### Tracking Progres
- Penyimpanan otomatis hasil eksperimen ke cloud
- Riwayat simulasi yang telah dilakukan
- Statistik quiz per kategori eksperimen

### Sistem Quiz
- Quiz dinamis yang di-generate berdasarkan parameter acak
- Pertanyaan disesuaikan dengan setiap jenis simulasi
- Toleransi jawaban yang realistis berdasarkan perhitungan fisika
- Tracking statistik: jumlah percobaan, jawaban benar/salah

### Multi-Platform
- **Web Application**: Dapat diakses melalui browser modern
- **Mobile Application**: React Native app untuk iOS, Android, dan Web (via Expo)

---

## Struktur Repository

```
SimuLab/
├── README.md                 # Dokumentasi utama
├── vercel.json              # Konfigurasi deployment Vercel
│
├── frontend/                # Web Application (Static HTML/CSS/JS)
│   ├── index.html           # Landing page
│   ├── pendulum.html        # Halaman simulasi bandul
│   ├── freefall.html        # Halaman simulasi jatuh bebas
│   ├── projectile.html      # Halaman simulasi gerak parabola
│   ├── profile.html         # Halaman profil pengguna
│   ├── style.css            # Stylesheet utama
│   ├── script.js            # Logic aplikasi & API calls
│   └── assets/              # Gambar dan aset statis
│
├── backend/                 # API Server (Node.js/Express)
│   ├── package.json         # Dependencies backend
│   ├── server.js            # Entry point server lokal
│   ├── api/
│   │   └── index.js         # Serverless function entry (Vercel)
│   ├── controllers/
│   │   ├── authController.js      # Logika autentikasi
│   │   ├── profileController.js   # Manajemen profil pengguna
│   │   ├── progressController.js  # Tracking progres simulasi
│   │   └── quizController.js      # Sistem quiz & validasi jawaban
│   └── config/
│       ├── database.js      # Konfigurasi PostgreSQL/Neon
│       ├── env.js           # Environment variables
│       └── supabase.js      # Konfigurasi Supabase client
│
└── mobile/                  # Mobile Application (React Native/Expo)
    ├── package.json         # Dependencies mobile
    ├── app.json             # Konfigurasi Expo
    ├── tsconfig.json        # TypeScript configuration
    ├── app/                  # Expo Router pages
    │   ├── _layout.tsx      # Root layout
    │   ├── index.tsx        # Entry point / splash
    │   ├── (auth)/          # Auth screens
    │   │   ├── login.tsx
    │   │   └── register.tsx
    │   ├── (tabs)/          # Tab navigation
    │   │   ├── home.tsx
    │   │   ├── simulations.tsx
    │   │   └── profile.tsx
    │   └── simulation/      # Simulation screens
    │       ├── [type].tsx   # Dynamic route
    │       ├── freefall.tsx
    │       ├── pendulum.tsx
    │       └── projectile.tsx
    ├── components/ui/       # Reusable UI components
    ├── constants/           # Theme & global styles
    ├── contexts/            # React Context (Auth)
    └── lib/                 # Utilities (Supabase, quiz logic)
```

---

## Tech Stack

### Web Application
| Layer | Teknologi |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Neon/Supabase) |
| Auth | JWT, bcrypt |
| Hosting | Vercel (Serverless) |

### Mobile Application
| Layer | Teknologi |
|-------|-----------|
| Framework | React Native + Expo SDK 52 |
| Router | Expo Router v4 |
| Language | TypeScript |
| Backend | Supabase (Auth + Database) |
| Styling | React Native StyleSheet |

---

## Roadmap & Improvement

### Fitur yang Dapat Ditambahkan

#### Simulasi Baru
- [ ] **Hukum Hooke** - Simulasi pegas dan elastisitas
- [ ] **Rangkaian Listrik** - Simulasi rangkaian seri/paralel sederhana
- [ ] **Gelombang** - Visualisasi gelombang transversal dan longitudinal
- [ ] **Optika Geometri** - Simulasi pembiasan dan pemantulan cahaya
- [ ] **Termodinamika** - Simulasi ekspansi gas ideal

#### Peningkatan UX/UI
- [ ] **Dark Mode** - Tema gelap untuk kenyamanan mata
- [ ] **Animasi yang Lebih Halus** - Menggunakan library animasi seperti Framer Motion
- [ ] **Onboarding Tutorial** - Panduan interaktif untuk pengguna baru
- [ ] **Responsive Design** - Optimasi tampilan untuk berbagai ukuran layar
- [ ] **Accessibility** - Dukungan screen reader dan navigasi keyboard

#### Fitur Pembelajaran
- [ ] **Modul Teori** - Penjelasan konsep fisika sebelum simulasi
- [ ] **Video Tutorial** - Panduan video untuk setiap eksperimen
- [ ] **Leaderboard** - Papan peringkat untuk quiz
- [ ] **Achievement System** - Badge dan pencapaian untuk memotivasi pengguna
- [ ] **Export Data** - Ekspor hasil eksperimen ke PDF/CSV

#### Teknis
- [ ] **Unit Testing** - Test coverage untuk backend dan frontend
- [ ] **E2E Testing** - Automated testing dengan Cypress/Playwright
- [ ] **CI/CD Pipeline** - Automated deployment dengan GitHub Actions
- [ ] **API Documentation** - Swagger/OpenAPI untuk dokumentasi endpoint
- [ ] **Error Monitoring** - Integrasi Sentry untuk tracking error
- [ ] **Performance Monitoring** - Analytics dan metrics dashboard
- [ ] **PWA Support** - Progressive Web App untuk offline access
- [ ] **Real-time Sync** - WebSocket untuk sinkronisasi data real-time

---
