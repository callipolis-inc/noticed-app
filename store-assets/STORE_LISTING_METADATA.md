# Noticed — Official Store Listing Metadata & Submission Kit

> **Target Platforms:** Apple App Store Connect & Google Play Console  
> **App Version:** 1.0.0  
> **Bundle ID / Package Name:** `com.syntheticae.noticed`  
> **Publisher:** Callipolis Inc.  
> **Date:** October 13, 2026  

---

## 🍎 1. Apple App Store Connect

### Basic App Information
* **App Name (max 30 characters):**  
  `Noticed: Private Field Notes`
* **Subtitle (max 30 characters):**  
  `Sovereign Offline Notebook`
* **Primary Category:**  
  `Productivity`
* **Secondary Category:**  
  `Lifestyle` (or `Books`)

---

### Description & Text Fields

#### Promotional Text (max 170 characters)
> *A quiet, local-sovereign chronicle. Capture intimate thoughts, analog photos, and voice memos with Penguin Classics typography. Offline-first, private by design.*

#### Full Description
```markdown
Noticed is a quiet, offline-first personal and shared chronicle designed for those who appreciate the tactile intimacy of physical notebooks and classic editorial typography.

Crafted with Penguin Classics aesthetics and analog discipline, Noticed gives your thoughts, field notes, and visual memories a sovereign haven—free from intrusive algorithms, behavioral tracking, and algorithmic clutter.

◆ TYPOGRAPHIC INTENSITY
• Penguin Classics Tri-Band Folio: Classic book spine layouts and glass pedestals that ground your library.
• Editorial Typefaces: Immerse in bespoke serif and monospace typefaces inspired by historic literature.
• Companion Marginalia: Anchor delicate sidenotes, footnotes, and highlights directly into your sentences.

◆ ANALOG DARKROOM
• Physical Film Emulsion: Curate timeless Polaroid and borderless photostrips with analog grain and archival date-stamps.
• Inscription Typewriter: Emprint nostalgic locations, moments, and captions directly onto your prints.

◆ ACOUSTIC VOICE MEMOS
• Tactical Letterpress Player: Record voice notes and capture raw thoughts with inline waveform scrubbers.
• High-Fidelity Audio: Keep spoken thoughts attached seamlessly to written marginalia.

◆ SOVEREIGN BY DESIGN
• Offline-First: All notes and media live directly on your physical device in sandboxed storage.
• No Surveillance: 0 third-party advertising SDKs, 0 tracking pixels, 0 data brokers.
• Optional Cloud Sync: Seamlessly sync across your devices via end-to-end encrypted cloud storage.
• Instant Portability: Export complete, unencrypted JSON archives or printable Markdown manuscripts anytime.

For things you don't want to forget.
```

#### Keywords (max 100 characters, comma-separated, no spaces)
```text
notes,journal,diary,notebook,offline,writer,markdown,darkroom,polaroid,aesthetic,minimalist,poetry
```

---

### Store URLs & Contact
* **Support URL:** `https://noticed.app`
* **Support / Contact Email:** `sidenotes.inc@gmail.com`
* **Marketing URL:** `https://noticed.app`
* **Privacy Policy URL:** `https://noticed.app/privacy`

---

### Visual Asset Specifications
1. **App Store Master Icon:**
   - **File:** `store-assets/AppStore-1024x1024-noalpha.png`
   - **Dimensions:** 1024 × 1024 px
   - **Pixel Format:** 24bpp RGB (*Zero alpha channel / transparency, conforming to Apple's strict validator*).
2. **Screenshots Required:**
   - **6.7" Display (iPhone 16 Pro Max / 15 Pro Max):** 1290 × 2796 px (Portrait)
   - **6.5" Display (iPhone 14 Plus / 11 Pro Max / XS Max):** 1242 × 2688 px (Portrait)
   - Minimum 3 screenshots required per display size.

---

<br/>

## 🤖 2. Google Play Console

### Store Listing Details
* **App Name (max 30 characters):**  
  `Noticed: Private Field Notes`
* **Short Description (max 80 characters):**  
  `Quiet, offline-first field notes with Penguin Classics editorial typography.`
* **Category:**  
  `Productivity`
* **Tags:**  
  `Notes`, `Journal`, `Writing`, `Offline`, `Personalization`

---

#### Full Description (max 4000 characters)
*(Gunakan teks yang sama dengan Full Description Apple di atas)*

---

### Store Graphics & Artwork
1. **App Icon:**
   - **File:** `store-assets/GooglePlay-512x512.png`
   - **Dimensions:** 512 × 512 px (PNG, 32-bit color)
2. **Feature Graphic (Mandatory):**
   - **File:** `store-assets/GooglePlay-FeatureGraphic-1024x500.png`
   - **Dimensions:** 1024 × 500 px (PNG, no alpha)
3. **Phone Screenshots:**
   - **Folder:** `store-assets/screenshots/android-phone/`
   - **Dimensions:** 1080 × 2400 px (Aspect ratio 9:20 / 9:16 portrait)
   - **Files:**
     - `01-bookshelf-library.png`: Tampilan rak buku & edisi buku klasik
     - `02-notebook-chronicle.png`: Kronologi catatan editorial & foto polaroid
     - `03-create-field-note.png`: Komposer catatan lapangan markdown & tipografi
     - `04-author-profile-vault.png`: Vault profil penulis, statistik & privasi offline

---

### 📸 Tangkapan Layar Lengkap yang Sudah Digenerate

Semua file tangkapan layar telah ditangkap secara otomatis dengan browser headless beresolusi native tinggi dengan data demo editorial:

| Folder | Perangkat / Resolusi | Kegunaan di Toko |
|---|---|---|
| `store-assets/screenshots/ios-6.7-inch/` | **1290 × 2796 px** | Wajib untuk iPhone 16 Pro Max / 15 Pro Max di App Store Connect |
| `store-assets/screenshots/ios-6.5-inch/` | **1242 × 2688 px** | Wajib untuk iPhone 14 Plus / 11 Pro Max / XS Max di App Store Connect |
| `store-assets/screenshots/android-phone/` | **1080 × 2400 px** | Wajib untuk Google Play Store Phone Screenshots (min. 4 gambar) |

---

### Mandatory Compliance URLs (Google Play Policy)
* **Privacy Policy URL:**  
  `https://noticed.app/privacy`
* **User Data Deletion Request URL (Mandatory for apps with accounts):**  
  `https://noticed.app/privacy#data-deletion`

---

### 🛡️ 3. Google Play Data Safety Answers

Saat mengisi formulir **Data Safety** di Google Play Console:

1. **Does your app collect or share any of the required user data types?**  
   👉 **Yes** (Only if the user optionally creates a cloud account).
2. **Is all user data collected by your app encrypted in transit?**  
   👉 **Yes** (Transmitted via HTTPS / TLS 1.3).
3. **Do you provide a way for users to request that their data be deleted?**  
   👉 **Yes** (Users can delete in-app via Profile > Delete Account & Data, or request via `https://noticed.app/privacy#data-deletion`).
4. **Data Types Declared:**
   - **Email Address**: Collected for Account Management & Authentication (Optional).
   - **Photos and Videos**: Collected for App Functionality (User-initiated attachments only).
   - **Voice or Sound Recordings**: Collected for App Functionality (Voice memos).
   - **Personal Messages / Notes**: Collected for App Functionality (Note text and marginalia).
   *All data is marked as "Not shared with third parties" and "Ephemeral or user-managed retention".*

---

## ✅ 4. Checklist Eksekusi Sebelum Submit

- [x] Fitur Hapus Akun (*In-App Delete Account*) aktif di ProfileSheet.
- [x] Migrasi RPC Supabase `delete_user_account` siap dijalankan.
- [x] Platform iOS terkonfigurasi di `ios/App`.
- [x] Platform Android terkonfigurasi di `android/` dengan targetSdk 36.
- [x] Izin kamera & mikrofon dideklarasikan di Info.plist & AndroidManifest.xml.
- [x] Halaman Privacy Policy & Terms of Service live di `https://noticed.app/privacy` dan `/terms`.
- [x] Master App Icon 1024x1024 (Format 24bpp RGB tanpa alpha) siap di `store-assets/`.
- [x] Feature Graphic Google Play 1024x500 siap di `store-assets/`.
- [x] Paket lengkap tangkapan layar 1290x2796 (iOS 6.7"), 1242x2688 (iOS 6.5"), dan 1080x2400 (Android) siap di `store-assets/screenshots/`.
