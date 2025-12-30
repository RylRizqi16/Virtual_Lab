# Virtual Lab Mobile

Aplikasi React Native Universal (iOS, Android, Web) untuk Virtual Lab Physics Simulations.

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) (SDK 52)
- **Router**: [Expo Router](https://docs.expo.dev/router/introduction/) v4
- **Backend**: [Supabase](https://supabase.com/)
- **Language**: TypeScript
- **Styling**: React Native StyleSheet

## Struktur Folder

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens (login, register)
│   ├── (tabs)/            # Tab-based navigation (home, simulations, profile)
│   ├── simulation/        # Dynamic simulation screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point / splash
├── components/            # Reusable components
│   └── ui/               # UI primitives (Button, Card, etc.)
├── constants/            # Theme, colors, global styles
├── contexts/             # React Context (Auth, etc.)
├── lib/                  # Utilities (Supabase client, etc.)
└── assets/               # Images, fonts
```

## Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Supabase

Copy `.env.example` to `.env` dan isi dengan kredensial Supabase Anda:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Add Asset Images

Tambahkan gambar berikut ke `assets/images/`:
- `icon.png` (1024x1024)
- `splash.png` (1284x2778)
- `adaptive-icon.png` (1024x1024)
- `favicon.png` (48x48)

### 4. Run the App

```bash
# Start development server
npm start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Web browser
```

## Migrasi dari HTML/JS

Untuk memigrasikan komponen dari kode HTML/JS lama:

1. Berikan kode HTML/JS yang ingin dikonversi
2. Saya akan mengubahnya menjadi komponen React Native
3. Komponen akan menggunakan:
   - `View` → `<div>`
   - `Text` → `<span>`, `<p>`, `<h1>`-`<h6>`
   - `TouchableOpacity` → `<button>`
   - `Image` → `<img>`
   - `TextInput` → `<input>`
   - `StyleSheet.create()` → CSS
   - `useState`/`useEffect` → DOM manipulation

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Landing | `/` | Splash/redirect |
| Login | `/(auth)/login` | User login |
| Register | `/(auth)/register` | User registration |
| Home | `/(tabs)/home` | Dashboard |
| Simulations | `/(tabs)/simulations` | List of simulations |
| Profile | `/(tabs)/profile` | User profile |
| Free Fall | `/simulation/freefall` | Free fall simulation |
| Pendulum | `/simulation/pendulum` | Pendulum simulation |
| Projectile | `/simulation/projectile` | Projectile motion |

## Components

### UI Components

- `Button` - Customizable button with variants
- `TextInput` - Styled text input with label and error
- `Card` - Container card component
- `SliderInput` - Slider with label and value display

### Usage

```tsx
import { Button, Card, TextInput } from '@/components/ui';

<Button 
  title="Start" 
  onPress={() => {}} 
  variant="primary" 
/>

<Card title="Parameters">
  <TextInput 
    label="Height" 
    value={height} 
    onChangeText={setHeight} 
  />
</Card>
```

## Notes

- Semua komponen sudah cross-platform (iOS, Android, Web)
- Gunakan `@/` alias untuk import dari root
- Theme colors tersedia di `constants/theme.ts`
- Global styles tersedia di `constants/styles.ts`
