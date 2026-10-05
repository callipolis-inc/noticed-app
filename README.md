# Noticed — for things you don't want to forget

A mindful, minimalist field notebook and quiet personal editorial space engineered with bespoke Apple-Style High-Density Liquid Glass aesthetics and offline-first persistence.

## ✨ Highlights

- **Apple-Style High-Density Liquid Glass UI**: Translucent milky porcelain surfaces, caustic specular rims, tactile iOS spring interactions, and grouped insets.
- **Offline-First Architecture**: Powered by IndexedDB and safe localStorage persistence with client-side photo compression.
- **Spatial 3D Bookshelf**: Cover Flow notebook carousel with physical buckram textures, headband ribbons, and debossed letterpress details.
- **Editorial Typography**: Penguin Classics borderless footnotes, inline highlight callouts, dynamic audio capsules, and timeline scrubber.
- **Cloud Sync Ready**: Prepared for seamless integration with Supabase (idempotent SQL schema included in `supabase/schema.sql`).

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Framer Motion
- **Icons**: Lucide React
- **Mobile Packaging**: Capacitor (iOS / IPA)
- **Backend & Sync**: Supabase

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase URL and anon key:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Build & Preview
```bash
npm run build
npm run preview
```
