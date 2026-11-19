# Konter Digital — Starter Website

Website penjualan Top Up HGI dengan frontend statis, dashboard admin, backend Vercel Functions, dan persiapan integrasi QRIS.

## Status penting

- Frontend katalog: siap dikembangkan.
- Backend membuat pesanan: siap setelah Supabase dikonfigurasi.
- Admin: login Supabase Auth, CRUD produk, melihat pesanan.
- GoPay QRIS langsung: **belum aktif**. Akun GoPay Merchant tidak otomatis berarti akun memiliki akses API. Minta aktivasi API QRIS dinamis, kredensial, dokumentasi endpoint, signing, dan webhook resmi dari GoPay. File `api/create-payment.js` dan `api/webhook.js` sengaja mengembalikan 501 sampai dokumentasi resmi tersedia. Jangan menganggap pembayaran lunas dari screenshot atau callback tanpa verifikasi signature.

## A. Buat database Supabase

1. Buat project di https://supabase.com/.
2. Buka SQL Editor, jalankan `supabase/schema.sql`.
3. Dari Project Settings → API, salin Project URL dan anon/public key.
4. Buat user admin di Authentication → Users.
5. Salin UUID user tersebut, lalu jalankan SQL berikut (ganti UUID):
   `insert into public.profiles (id, role) values ('UUID-ADMIN', 'admin');`
6. Tambahkan produk melalui dashboard admin setelah konfigurasi selesai.

## B. Konfigurasi frontend

Edit `config.js`:
- `API_BASE_URL`: URL deployment Vercel, mis. `https://nama-project.vercel.app`
- `SUPABASE_URL`: Project URL Supabase
- `SUPABASE_ANON_KEY`: anon/public key

Anon key memang digunakan di browser; keamanan data ditentukan oleh RLS. Jangan masukkan service role key ke `config.js`.

## C. Deploy backend ke Vercel

1. Push folder project ini ke repository GitHub.
2. Import repository ke Vercel.
3. Tambahkan environment variables di Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (rahasia, server-only)
   - `ALLOWED_ORIGINS` (alamat GitHub Pages dan domain Vercel)
4. Deploy.
5. Isi `API_BASE_URL` di `config.js` dengan domain Vercel lalu commit ulang.

## D. Deploy frontend ke GitHub Pages

1. Pada repository GitHub, buka Settings → Pages.
2. Pilih Deploy from a branch.
3. Pilih branch `main`, folder `/ (root)`, lalu Save.
4. Buka URL Pages. `index.html`, `admin.html`, CSS, JS, dan `config.js` harus berada di root yang sama.

## E. Aktivasi GoPay Merchant API

Hubungi kanal dukungan/merchant resmi GoPay dan minta:
- akses API QRIS dinamis untuk merchant,
- dokumentasi API create payment dan inquiry/status,
- client/merchant credentials,
- cara membuat signature request,
- spesifikasi webhook, signature validation, dan retry policy,
- environment sandbox dan production.

Setelah dokumen resmi tersedia, implementasikan kontrak tersebut di:
- `api/create-payment.js`
- `api/webhook.js`

Jangan menebak URL endpoint, header, algoritma signature, atau struktur payload. Jangan pernah expose secret di frontend. Webhook wajib memverifikasi signature, mencocokkan order ID dan nominal, memproses event secara idempotent, lalu baru mengubah status menjadi `paid`.

## F. Uji sebelum dipakai

- Uji katalog, pencarian, filter, dan harga.
- Uji login admin dan role.
- Uji create order dan pastikan total diambil dari database, bukan harga kiriman browser.
- Uji webhook sandbox dengan signature valid/tidak valid, nominal salah, event duplikat, dan transaksi kedaluwarsa.
- Jangan menerima pembayaran pelanggan sungguhan sampai seluruh pengujian dan aktivasi API selesai.

## Catatan harga

Produk contoh hanya data demo untuk tampilan awal: HGI 1B Rp57.000, 500M Rp34.000, 200M Rp17.000, dan 100M Rp9.000. Ubah/hapus melalui dashboard admin. Jasa bongkar diarahkan ke WhatsApp https://wa.me/66839381864. Pastikan harga, stok, dan ketentuan produk sesuai usaha sebelum dipublikasikan.
