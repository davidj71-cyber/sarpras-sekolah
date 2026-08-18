# 📖 Panduan Penggunaan SIMAPRAS

**SIMAPRAS** (Sistem Informasi Manajemen Sarana Prasarana Sekolah) adalah aplikasi terintegrasi untuk mengelola inventaris sekolah, pesanan, gaji/honor pegawai, iuran media, hingga pencetakan dokumen resmi.

Panduan ini menjelaskan setiap fitur secara lengkap, langkah demi langkah, agar pengguna baru maupun lama dapat mengoperasikan aplikasi dengan mudah.

---

## Daftar Isi

1. [Memulai](#1-memulai)
2. [Login & Hak Akses](#2-login--hak-akses)
3. [Dashboard](#3-dashboard)
4. [Pengaturan Sekolah](#4-pengaturan-sekolah)
5. [Kelola Akun](#5-kelola-akun)
6. [Pegawai](#6-pegawai)
7. [Toko, Pesanan & Barang Masuk](#7-toko-pesanan--barang-masuk)
8. [KIB (Kartu Inventaris Barang)](#8-kib-kartu-inventaris-barang)
9. [Inventaris (Gedung, Ruang, Barang)](#9-inventaris-gedung-ruang-barang)
10. [Gaji & Honor](#10-gaji--honor)
11. [Media (Iuran Koran & Majalah)](#11-media-iuran-koran--majalah)
12. [Mencetak Dokumen](#12-mencetak-dokumen)
13. [Menginstal Aplikasi di Android (PWA)](#13-menginstal-aplikasi-di-android-pwa)
14. [Impor & Ekspor Data Excel](#14-impor--ekspor-data-excel)
15. [FAQ & Pemecahan Masalah](#15-faq--pemecahan-masalah)

---

## 1. Memulai

### Membuka Aplikasi
Buka aplikasi melalui browser (Chrome/Edge direkomendasikan). Halaman login akan tampil pertama kali.

### Akun Default (Administrator)
Saat pertama kali dijalankan, aplikasi membuat akun administrator default:

| Username | Password | Role |
|----------|----------|------|
| `admin`  | `admin`  | Administrator |

> ⚠️ **Penting:** Segera ubah password admin default di menu **Kelola Akun** setelah login pertama untuk keamanan.

---

## 2. Login & Hak Akses

### Cara Login
1. Masukkan **Username** dan **Password**.
2. Klik tombol **Masuk**.
3. Jika benar, Anda akan diarahkan ke Dashboard.

### Hak Akses per Role

| Role | Akses |
|------|-------|
| **Administrator** | Semua fitur: Dashboard, Pengaturan, Kelola Akun, Pegawai, Toko, KIB, Inventaris, Gaji & Honor, Media |
| **Staff / Sarpras** | Dashboard, Toko, KIB, Inventaris (tidak dapat mengakses Gaji, Media, Kelola Akun, Pengaturan) |

> Administrator dapat membuat akun staff dan menentukan role-nya di menu **Kelola Akun**.

### Keluar (Logout)
Klik tombol **Keluar** di bagian bawah sidebar.

---

## 3. Dashboard

Dashboard menampilkan ringkasan data sekolah:
- **Statistik aset** (jumlah barang, ruang, gedung, dll.)
- **Ringkasan aktivitas** terkini
- **Akses cepat** ke fitur utama

Gunakan dashboard sebagai titik awal untuk memantau kondisi inventaris secara umum.

---

## 4. Pengaturan Sekolah

Menu **Pengaturan** (ikon gerai) berisi konfigurasi yang berlaku untuk seluruh aplikasi dan dokumen cetak. Hanya Administrator yang dapat mengaksesnya.

### 4.1 Identitas Sekolah
- **Nama Sekolah** — digunakan di judul dokumen cetak, sidebar, dan manifest PWA (nama ikon saat diinstall di Android).
- **NPSN** — Nomor Pokok Sekolah Nasional.
- **Alamat, Provinsi, Telepon, Email** — tampil di KOP surat.
- **Kode Sekolah & Kode Unit** — untuk penomoran surat.

### 4.2 Logo & Ikon
- **Logo KOP Surat** — logo yang tampil di header dokumen cetak (raksananya di atas judul).
- **Logo Aplikasi / Favicon** — logo yang tampil di tab browser, sidebar, login page, dan watermark dokumen. Logo ini juga menjadi **ikon aplikasi saat diinstall di Android**.
- **Ukuran Logo** (lebar & tinggi dalam cm) — sesuaikan rasio logo Anda.

> 💡 **Tips:** Upload logo berformat PNG/JPG/SVG dengan ukuran minimal 512×512 px agar tajam saat jadi ikon Android.

### 4.3 KOP Surat
- **Baris Header** (nama sekolah, besar) dan **Baris Detail** (alamat/NPSN, kecil) — bisa diatur urutan, tebal, ukuran font, dan transformasi teks (uppercase/capitalize/dll).
- **Font, Ukuran Font, Ketebalan Underline, Lebar Underline** — kustomisasi tampilan KOP.
- Gunakan tombol **Tambah Baris** / **Hapus** untuk menambah/mengurangi baris KOP.

### 4.4 Penandatangan Laporan
Data ini otomatis tampil di blok tanda tangan semua dokumen cetak:
- **Kepala Sekolah** (Nama + NIP)
- **Bendahara** (Nama + NIP)
- **Pengurus Barang** (Nama + NIP) — untuk dokumen inventaris

### 4.5 Kode Anggaran
Kode-kode berikut tampil di blok metadata (pojok kanan atas) dokumen cetak Gaji & Media:
- **Gaji:** Kode, Kode Program, Kode Kegiatan, Kode Rekening
- **Media:** Kode, Kode Program, Kode Kegiatan, Kode Rekening

Setelah mengubah pengaturan, klik **Simpan**. Perubahan langsung berlaku di dokumen cetak berikutnya.

---

## 5. Kelola Akun

Menu **Kelola Akun** (hanya Administrator) untuk mengelola pengguna aplikasi.

### Menambah Akun
1. Klik **Tambah Akun**.
2. Isi **Nama Lengkap, Username, Password, Role** (Administrator / Staff).
3. Klik **Simpan**.

### Mengedit / Menghapus Akun
- Tombol **Edit** (di kolom paling kiri tabel) — ubah data akun.
- Tombol **Hapus** — hapus akun (akun yang sedang login tidak bisa dihapus).

> 🔒 **Keamanan:** Gunakan password yang kuat (min. 8 karakter, campuran huruf & angka). Jangan gunakan akun administrator untuk pekerjaan harian — buat akun Staff untuk petugas sarpras.

---

## 6. Pegawai

Menu **Pegawai** menyimpan data pegawai/guru sekolah. Data ini dipakai oleh fitur **Gaji & Honor**.

### Menambah Pegawai
1. Klik **Tambah Pegawai**.
2. Isi: **Nama, NIP, No. Rekening Tabungan, Status, Jabatan, Jumlah (Les/Bulan), Satuan, Harga Satuan**.
3. Klik **Simpan**.

### Status Pegawai (penting untuk cetak Gaji)
Status menentukan satuan dan perhitungan di dokumen cetak gaji:

| Status | Satuan di Cetak | Jumlah dihitung dari |
|--------|----------------|----------------------|
| GTTS / HONORER SEKOLAH / GURU SEMENTARA | **JPL** (Jam Pelajaran) | Jumlah Les |
| PTTS / PETUGAS KEBERSIHAN / PENJAGA SEKOLAH | **OB** | Jumlah Bulan |

### Impor Massal dari Excel
1. Klik **Impor Excel**.
2. Pilih file `.xlsx` / `.xls` dengan format kolom: `NO, NAMA, NO. REKENING TABUNGAN, JUMLAH BULAN/JAM PELAJARAN, SATUAN, HARGA SATUAN/BULAN/JAM PELAJARAN, PENERIMAAN BERSIH, STATUS, JABATAN`.
3. Baris judul & footer (GTTS/PTTS/HONORER) otomatis dilewati.
4. Klik **Download Template** untuk mendapatkan format kosong jika belum punya.

---

## 7. Toko, Pesanan & Barang Masuk

Menu **Toko** memiliki 3 sub-menu (pilih lewat tab di bawah header):

### 7.1 Toko
Data toko/supplier tempat sekolah membeli barang.
- **Tambah Toko:** Nama toko, alamat, telepon, kontak.
- Dipakai saat membuat **Pesanan**.

### 7.2 Pesanan
Mencatat pesanan pembelian barang ke toko/supplier.
1. Klik **Buat Pesanan**.
2. Pilih **Toko** (supplier).
3. Tambahkan **item pesanan** (nama barang, qty, harga, satuan).
4. Isi tanggal pesanan & nomor surat.
5. Simpan. Setelah barang datang, ubah status jadi **Diterima**.
- **Cetak Bon/Pesanan:** tombol Cetak di kolom Aksi (kiri) untuk mencetak bon pembelian.
- **Foto Bukti:** unggah foto bon/nota fisik sebagai arsip.

### 7.3 Barang Masuk
Mencatat barang yang sudah diterima (masuk ke gudang) dari pesanan.
- Pilih pesanan terkait → klik **Barang Masuk**.
- Barang otomatis masuk ke stok inventaris.

---

## 8. KIB (Kartu Inventaris Barang)

Menu **KIB** mencatat aset tetap sekolah sesuai regulasi BMD. Pilih kategori via tab di bawah header:

| KIB | Jenis Aset |
|-----|-----------|
| **A** | Tanah |
| **B** | Peralatan & Mesin |
| **C** | Gedung & Bangunan |
| **D** | Jalan, Irigasi & Jaringan |
| **E** | Aset Tetap Lainnya |
| **F** | Konstruksi Dalam Pengerjaan |

### Menambah Aset
1. Pilih kategori KIB (A–F).
2. Klik **Tambah Aset**.
3. Isi data: nama barang, kode, tahun perolehan, nilai, kondisi, sumber dana, dsb.
4. Simpan.

### Mencetak KIB
- Tombol **Cetak** di kolom Aksi untuk mencetak Kartu Inventaris Barang per kategori.

---

## 9. Inventaris (Gedung, Ruang, Barang)

Menu **Inventaris** mengelola letak fisik barang di sekolah. 3 sub-menu:

### 9.1 Gedung
Data gedung/bangunan sekolah. Tambah gedung → isi nama, lokasi, keterangan.

### 9.2 Ruang
Data ruangan di tiap gedung. Pilih gedung → tambah ruang (kelas, lab, kantor, gudang, dll).

### 9.3 Barang di Ruang
Daftar barang yang berada di setiap ruang. Barang bisa berasal dari:
- **Barang Masuk** (dari pesanan toko), atau
- **Input manual** (aset yang sudah ada).
- Filter berdasarkan gedung/ruang untuk melihat barang di lokasi tertentu.

> 💡 Gunakan fitur ini untuk opname (stock opname) berkala. Cetak daftar barang per ruang untuk verifikasi fisik.

---

## 10. Gaji & Honor

Menu **Gaji** mengelola pembayaran honor pegawai tidak tetap (GTTS, PTTS, Petugas Kebersihan, Penjaga Sekolah).

### Alur Pembayaran Gaji
1. Pastikan data pegawai sudah diinput di menu **Pegawai** (dengan status, jumlah les/bulan, & harga satuan).
2. Buka menu **Gaji** → pilih **tahun**.
3. Klik **Cetak** pada pegawai yang akan dibayar.
4. Di dialog cetak:
   - Pilih **Status** (filter pegawai per kategori).
   - Pilih **bulan** yang akan dibayar (centang).
   - Pilih pegawai (centang yang akan dicetak).
   - Pilih **orientasi** (Portrait/Landscape) dan **mode cetak**:
     - **Tanda Tangan** (7 kolom, ada kolom tanda tangan)
     - **Bank** (6 kolom, tanpa tanda tangan — untuk submit ke bank)
   - Atur **tanggal cetak** & **tempat**.
5. Klik **Cetak** → dokumen terbuka di tab baru → pilih **Simpan sebagai PDF** atau cetak langsung.

### Bukti Pembayaran (Foto)
- Pada bulan tertentu, klik tombol **Bayar** di kolom Aksi.
- Di dialog pembayaran, pilih bulan → klik **Upload Bukti** untuk mengunggah foto bukti transfer/tanda terima.
- Mendukung: kamera HP langsung (`capture=environment`), galeri, kompresi otomatis, maks. 5 foto per pembayaran.
- Status pembayaran: **Tercetak (Tanda Tangan)**, **Tercetak (Bank)**, **Lunas** (kedua mode sudah tercetak).

### Status & Satuan di Cetak Gaji
- **GTTS** → jumlah = **jumlah les**, satuan = **JPL**
- **PTTS / Petugas Kebersihan / Penjaga Sekolah** → satuan = **OB**

### Nama File PDF
Saat "Save as PDF", nama file otomatis: `Gaji_[Nama Status]_[Bulan] [Tahun]`
Contoh: `Gaji_GURU TIDAK TETAP SEKOLAH (GTTS)_BULAN AGUSTUS 2025`

---

## 11. Media (Iuran Koran & Majalah)

Menu **Media** mengelola pembayaran iuran langganan koran & majalah.

### Menambah Media
1. Klik **Tambah Media**.
2. Isi: **Nama Pemilik/Penerima, Nama Media, Jenis Pembayaran, Harga per Bulan, Jumlah**.
3. Simpan.

### Mencetak Daftar Pembayaran Media
1. Klik **Cetak** → dialog cetak terbuka.
2. Pilih **tahun**, centang media & bulan yang akan dibayar.
3. Atur tanggal/tempat → klik **Cetak**.
4. Dokumen "DAFTAR PEMBAYARAN IURAN KORAN DAN MAJALAH" terbuka di tab baru.

### Bukti Pembayaran Media
Sama seperti Gaji — klik **Bayar**, pilih bulan, upload foto bukti.

### Nama File PDF
Saat "Save as PDF": `[Nama Pemilik Media]_[Bulan] [Tahun]`
Contoh: `Budi Santoso_BULAN AGUSTUS 2025` (multi-pemilik → `Budi Santoso dkk_BULAN...`)

---

## 12. Mencetak Dokumen

### Jenis Dokumen yang Bisa Dicetak
| Fitur | Dokumen |
|-------|---------|
| Gaji | Tanda Terima Pembayaran Honor |
| Media | Daftar Pembayaran Iuran Koran & Majalah |
| Pesanan | Bon Pesanan |
| KIB | Kartu Inventaris Barang (per kategori) |
| Inventaris | Daftar Barang per Ruang |

### Tips Mencetak
- **Orientasi Landscape:** saat pilih landscape, akan muncul banner kuning → klik **Cetak Sekarang**, lalu pilih **Landscape** di dialog cetak browser.
- **KOP & Watermark:** otomatis tampil dari Pengaturan. Watermark memakai logo aplikasi.
- **Judul otomatis fit:** font judul di-pre-compute supaya selalu muat 1 baris di halaman A4.
- **Penandatangan:** Kepala Sekolah, Bendahara, dan/atau Pengurus Barang otomatis dari Pengaturan.
- Saat **Simpan sebagai PDF**, nama file otomatis mengikuti format yang sudah ditentukan (lihat bagian Gaji/Media).

---

## 13. Menginstal Aplikasi di Android (PWA)

Aplikasi SIMAPRAS adalah **PWA** (Progressive Web App) — bisa diinstall di Android & iOS seperti aplikasi native, dengan **logo sekolah sebagai ikon**.

### Cara Install di Android (Chrome)
1. Buka aplikasi di **Chrome Android**.
2. Tunggu hingga tombol **"Pasang Aplikasi"** muncul di pojok kanan bawah (atau buka menu ⋮ → **Tambahkan ke layar utama**).
3. Klik **Pasang**.
4. Ikon aplikasi (logo sekolah) muncul di home screen HP.
5. Saat dibuka, aplikasi tampil **fullscreen tanpa address bar browser**.

### Cara Install di iOS (Safari)
1. Buka aplikasi di **Safari iOS**.
2. Tap tombol **Share** (kotak panah ke atas).
3. Pilih **Tambahkan ke Layar Utama** → **Tambah**.

### Mengubah Ikon
Ikon aplikasi mengikuti **Logo Aplikasi/Favicon** yang diupload di menu **Pengaturan**. Ubah logo di sana → ikon home screen otomatis berubah (mungkin perlu uninstall & install ulang di HP untuk refresh cache ikon).

---

## 14. Impor & Ekspor Data Excel

### Ekspor (Download) Database
- **Gaji:** tombol **Export Excel** → file `Database_Gaji.xlsx` (semua data pegawai).
- **Media:** tombol **Export Excel** → file `Daftar_Media.xlsx`.
- File berisi semua data terbaru — berguna untuk backup atau olah di Excel.

### Impor (Upload) Data
- **Gaji:** tombol **Impor Excel** → pilih file `.xlsx`/`.xls`.
  - Format kolom harus sama dengan template (lihat bagian 6).
  - Gunakan **Download Template** untuk format kosong.
- Sistem otomatis mendeteksi baris judul & footer (GTTS/PTTS/HONORER) dan melewatinya.

---

## 15. FAQ & Pemecahan Masalah

### Saat klik dropdown cetak, dialog langsung tertutup?
Sudah diperbaiki. Pastikan gunakan versi terbaru. Jika masih terjadi, refresh halaman (Ctrl+R / tarik ke bawah di HP).

### Tombol cetak tidak berfungsi setelah diklik sekali?
Sudah diperbaiki (guard reset langsung setelah print window terbuka). Jika macet, refresh halaman.

### Logo tidak tampil di dokumen cetak?
Periksa menu **Pengaturan** → pastikan **Logo Aplikasi** dan/atau **Logo KOP** sudah diupload & disimpan.

### Ikon di Android tidak berubah setelah ganti logo?
Cache ikon browser/Android perlu di-refresh. Cara:
1. Uninstall aplikasi dari HP.
2. Clear cache Chrome (Settings → Apps → Chrome → Storage → Clear cache).
3. Buka aplikasi lagi → install ulang.

### Lupa password admin?
Reset melalui database langsung atau hubungi developer. Akun default (`admin`/`admin`) hanya ada saat instalasi baru.

### Data tidak muncul setelah impor Excel?
- Pastikan format kolom persis sama dengan template.
- Baris kosong / baris footer (GTTS/PTTS) otomatis dilewati — ini normal.
- Cek apakah ada karakter khusus di nama/nomor rekening.

### Cetak PDF terpotong di pinggir?
- Pilih orientasi yang sesuai (Landscape untuk tabel lebar).
- Atur margin cetak browser ke **None** atau **Minimum** di dialog cetak.

### Aplikasi tidak bisa diakses (blank/putih)?
- Pastikan server berjalan.
- Coba browser lain (Chrome/Edge/Firefox).
- Clear cache browser lalu refresh.

---

## 💡 Tips Praktis

1. **Backup berkala:** Export Excel database Gaji & Media secara rutin sebagai cadangan.
2. **Pisahkan akun:** Jangan pakai akun admin untuk operasional harian. Buat akun Staff untuk petugas.
3. **Opname rutin:** Cetak daftar barang per ruang tiap semester untuk verifikasi fisik.
4. **Upload bukti:** Selalu upload foto bukti pembayaran gaji/media sebagai arsip digital.
5. **Install di HP:** Install aplikasi di Android untuk akses cepat dari home screen dengan logo sekolah.

---

## 📞 Bantuan

Jika menemui kendala yang tidak tercakup di panduan ini, hubungi administrator sistem atau developer aplikasi.

---

*Panduan ini berlaku untuk SIMAPRAS versi terbaru. Diperbarui sesuai perkembangan fitur.*
