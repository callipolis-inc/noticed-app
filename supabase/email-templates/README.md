# ✉️ Noticed — Standar Arsitektur Auth Zero-Cost & Zero-Friction

Dokumen ini berisi panduan konfigurasi Supabase Auth, Instant Sign-Up, dan Gmail Custom SMTP untuk aplikasi **Noticed** (`app.noticed.mobile`).

---

## ⚡ 1. Instant Sign-Up (Matikan "Confirm Email")

Agar pendaftaran user baru berlangsung instan (Auto-Login dalam <1 detik), tidak menguras kuota SMTP, dan tidak menghambat Reviewer Apple/Google yang menggunakan akun uji:

1. Buka **[Supabase Auth Providers — Email](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/providers?provider=Email)**.
2. Pastikan **Enable Email provider** = `ON`.
3. Matikan **Confirm email** = `OFF`.
4. Klik **Save**.

---

## 🔑 2. Setup Gmail Custom SMTP Gratis (Khusus Forgot / Reset Password)

Kita tidak menggunakan SDK email berbayar di sisi aplikasi. Pengiriman email ditangani murni oleh Supabase Auth menggunakan **Gmail App Password** (Gratis hingga 500 email/hari):

1. Buka pengaturan akun Google kamu di [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (pastikan 2-Step Verification sudah aktif).
2. Buat App Password baru dengan nama `Noticed Supabase Auth` dan salin 16 karakter password yang muncul.
3. Buka **[Supabase Auth SMTP Settings](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/smtp)** dan isi:
   - **Enable Custom SMTP**: `ON`
   - **Sender email**: `alamat-email-kamu@gmail.com`
   - **Sender name**: `Noticed`
   - **Host**: `smtp.gmail.com`
   - **Port number**: `465` (SSL) atau `587` (TLS)
   - **Username**: `alamat-email-kamu@gmail.com`
   - **Password**: *(Paste 16 digit Gmail App Password tanpa spasi)*
4. Klik **Save**.

---

## 📍 3. Pasang Template Email "Reset Password"

Buka **[Supabase Auth Email Templates](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/templates)**:

1. Pilih tab **Reset Password**.
2. **Subject:**  
   `Reset your Noticed password`
3. **Body:**  
   Salin seluruh isi file [`reset-password.html`](./reset-password.html) lalu *paste* ke dalam editor Body.
4. Klik **Save Changes**.

*(Template pelengkap [`confirm-signup.html`](./confirm-signup.html), [`magic-link.html`](./magic-link.html), dan [`change-email.html`](./change-email.html) juga tersedia di folder ini sebagai fallback).*

---

## 🌐 4. Konfigurasi URL Redirect & Site URL

Buka **[Supabase URL Configuration](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/url-configuration)**:

1. **Site URL:** `https://noticed.app`
2. **Redirect URLs:**
   - `https://noticed.app/**`
   - `app.noticed.mobile://*`
   - `http://localhost:5173/**`
   - `http://127.0.0.1:4173/**`
