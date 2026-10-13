# ✉️ Noticed — Supabase Email Templates & Auth Setup Guide

Dokumen ini berisi panduan untuk mengonfigurasi template email otentikasi Supabase dan pengaturan URL redirect untuk aplikasi **Noticed** (`app.noticed.mobile`).

---

## 📍 1. Di Mana Memasang Template Email?

Buka halaman konfigurasi template di dashboard Supabase kamu:  
👉 **[Supabase Auth Email Templates — Project ienbkpjldpzaewzewxfz](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/templates)**

Terdapat 4 template yang perlu diperbarui:

### A. Template "Magic Link" (Paling Utama — Digunakan saat Sign In / Sign Up OTP)
1. Di tab **Email Templates**, klik **Magic Link**.
2. **Subject:**  
   `Your Noticed sign-in code: {{ .Token }}`
3. **Body:**  
   Buka file [`magic-link.html`](./magic-link.html), salin seluruh isinya, lalu *paste* ke dalam editor Body.
4. Klik **Save Changes**.

---

### B. Template "Confirm signup"
1. Klik **Confirm signup**.
2. **Subject:**  
   `Welcome to Noticed — Confirm your account`
3. **Body:**  
   Buka file [`confirm-signup.html`](./confirm-signup.html), salin seluruh isinya, lalu *paste* ke dalam editor Body.
4. Klik **Save Changes**.

---

### C. Template "Reset Password"
1. Klik **Reset Password**.
2. **Subject:**  
   `Reset your Noticed password`
3. **Body:**  
   Buka file [`reset-password.html`](./reset-password.html), salin seluruh isinya, lalu *paste* ke dalam editor Body.
4. Klik **Save Changes**.

---

### D. Template "Change Email Address"
1. Klik **Change Email Address**.
2. **Subject:**  
   `Confirm your new email address for Noticed`
3. **Body:**  
   Buka file [`change-email.html`](./change-email.html), salin seluruh isinya, lalu *paste* ke dalam editor Body.
4. Klik **Save Changes**.

---

## 🌐 2. Konfigurasi URL Redirect & Site URL

Buka halaman:  
👉 **[Supabase URL Configuration](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/url-configuration)**

1. **Site URL:**  
   Isi dengan:  
   `https://noticed.app`

2. **Redirect URLs:**  
   Tambahkan URL berikut agar otentikasi bisa kembali ke aplikasi mobile maupun browser lokal:
   - `https://noticed.app/**`
   - `app.noticed.mobile://*`
   - `http://localhost:5173/**`
   - `http://127.0.0.1:4173/**`

---

## 🚀 3. Rekomendasi Custom SMTP (Opsional tapi Sangat Disarankan)

Buka halaman:  
👉 **[Supabase Auth SMTP Settings](https://supabase.com/dashboard/project/ienbkpjldpzaewzewxfz/auth/smtp)**

> [!IMPORTANT]
> **Limit Default Supabase:**  
> Secara bawaan, Supabase menyediakan server email bawaan gratis dengan batasan ketat:
> - Maksimal **30 email per jam**.
> - Alamat pengirim: `noreply@mail.app.supabase.io` (sering masuk tab Promosi atau folder Spam di Gmail).
> 
> **Solusi Terbaik (Gratis): Gunakan Resend (resend.com)**
> 1. Buat akun gratis di [Resend.com](https://resend.com) (gratis 3.000 email/bulan, 100 email/hari).
> 2. Verifikasi domain kamu `noticed.app` dengan menambahkan 3 DNS record (DKIM & SPF).
> 3. Buat API Key di Resend.
> 4. Di Supabase SMTP Settings, aktifkan **Enable Custom SMTP**:
>    - **Sender Email**: `auth@noticed.app` atau `no-reply@noticed.app`
>    - **Sender Name**: `Noticed`
>    - **Host**: `smtp.resend.com`
>    - **Port**: `465` (atau `587`)
>    - **User**: `resend`
>    - **Password**: Masukkan API key Resend (`re_...`)
> 5. Hasilnya: Email OTP Noticed akan terkirim dengan alamat resmi `@noticed.app`, tiba dalam 1–2 detik, dan dijamin 100% masuk ke Inbox utama!
