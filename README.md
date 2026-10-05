# Noticed — for things you don't want to forget

A mindful, minimalist field notebook and quiet personal editorial space engineered with bespoke **Apple-Style High-Density Liquid Glass** aesthetics, **Offline-First** persistence, and **Hybrid Supabase Cloud & Media Bucket Sync**.

📄 **Dokumentasi Lengkap**: Baca [**WHITEPAPER.md**](./WHITEPAPER.md) untuk penjelasan menyeluruh mengenai filosofi desain, arsitektur sistem, alur media (`noticed-media`), skema database, dan peta direktori.

---

## Highlights

- **Apple-Style High-Density Liquid Glass UI**: Translucent milky porcelain & obsidian surfaces, caustic specular rims, tactile iOS spring interactions, and grouped insets across 4 curated themes (*Warm Paper, Daylight, Obsidian, Espresso*).
- **Spatial 3D Bookshelf**: Interactive Spines Pedestal & 3D Cover Flow carousel with physical buckram textures, headband ribbons, debossed foil details, and time-zone aware greetings.
- **Editorial Manuscript Stream**: Penguin Classics borderless footnotes, sentence-anchored *marginalia*, multi-color inline text highlighter, inline autoplay 30s video clips, photostrip layouts, tactile voice memos, and Zen Reading Mode.
- **Offline-First + Silent Cloud Auto-Sync**: Powered by local IndexedDB (`AtelierDB`) and debounced background synchronization with Supabase PostgreSQL (`profiles`, `spaces`, `field_notes`) and Supabase Storage (`noticed-media` bucket with automatic orphan file purging).

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling & Motion**: Tailwind CSS v4 + Framer Motion
- **Iconography**: Lucide React (Strict monochrome outline system)
- **Mobile Packaging**: Capacitor 8 (iOS IPA Sideload Ready)
- **Cloud & Media Backend**: Supabase Auth, PostgreSQL, & Supabase Storage (`noticed-media`)

---

## Project Structure

- [`src/`](./src/) — Active application source code (`components/notes`, `components/spaces`, `components/ui`, `lib/`).
- [`supabase/`](./supabase/) — Idempotent PostgreSQL schema and Storage Bucket migration scripts.
- [`scripts/`](./scripts/) — iOS 1024×1024 App Icon generator (`generate_app_icons.cjs`).
- [`archive/`](./archive/README.md) — Archived legacy components, original transparent source assets, and early design references.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database & Storage Setup
Run the idempotent SQL scripts inside the **Supabase SQL Editor**:
1. [`supabase/schema.sql`](./supabase/schema.sql)
2. [`supabase/migrations/20261005_add_videos_to_field_notes.sql`](./supabase/migrations/20261005_add_videos_to_field_notes.sql)
3. [`supabase/migrations/20261005_create_storage_bucket.sql`](./supabase/migrations/20261005_create_storage_bucket.sql)

### 4. Build for Production
```bash
npm run build
```
