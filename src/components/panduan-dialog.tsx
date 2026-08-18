"use client";

import * as React from "react";
import { BookOpen, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Panduan Dialog (in-app user guide) ──────────────────────────────────────
// Buka lewat tombol "Panduan" di sidebar. Berisi ringkasan cara pakai setiap
// fitur, bisa dicari (filter). Bukan route baru — client-side dialog saja.

interface PanduanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GuideSection {
  id: string;
  title: string;
  body: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "mulai",
    title: "Memulai & Login",
    body:
      "Buka aplikasi → halaman login tampil. Akun administrator default: username \"admin\", password \"admin\" (segera ubah setelah login pertama!). Masukkan username & password → klik Masuk. Untuk keluar, klik tombol \"Keluar\" di bawah sidebar. Role Administrator dapat mengakses semua fitur; role Staff hanya Dashboard, Toko, KIB, dan Inventaris.",
  },
  {
    id: "pengaturan",
    title: "Pengaturan Sekolah",
    body:
      "Hanya Administrator. Isi Nama Sekolah, NPSN, alamat, kontak. Upload Logo KOP Surat (untuk header dokumen cetak) dan Logo Aplikasi/Favicon (untuk tab browser, sidebar, watermark, dan IKON saat diinstall di Android — gunakan min. 512×512 px). Atur baris KOP (header/detail, tebal, ukuran font). Isi data penandatangan: Kepala Sekolah, Bendahara, Pengurus Barang (nama+NIP) — otomatis tampil di semua dokumen cetak. Isi Kode Anggaran untuk Gaji & Media. Klik Simpan.",
  },
  {
    id: "akun",
    title: "Kelola Akun",
    body:
      "Hanya Administrator. Klik \"Tambah Akun\" → isi Nama, Username, Password, Role (Administrator/Staff) → Simpan. Edit/Hapus via tombol di kolom paling kiri tabel. Akun yang sedang login tidak bisa dihapus. Gunakan password kuat (min. 8 karakter). Buat akun Staff untuk petugas harian, simpan akun admin untuk konfigurasi.",
  },
  {
    id: "pegawai",
    title: "Pegawai",
    body:
      "Data pegawai/guru untuk fitur Gaji. Klik \"Tambah Pegawai\" → isi Nama, NIP, No. Rekening, Status, Jabatan, Jumlah (Les/Bulan), Satuan, Harga Satuan. Status penting: GTTS/HONORER SEKOLAH/GURU SEMENTARA → satuan JPL (jumlah les). PTTS/PETUGAS KEBERSIHAN/PENJAGA SEKOLAH → satuan OB. Impor massal via Excel (.xlsx) — format kolom: NO, NAMA, NO. REKENING, JUMLAH, SATUAN, HARGA SATUAN, PENERIMAAN BERSIH, STATUS, JABATAN. Tombol Download Template untuk format kosong.",
  },
  {
    id: "toko",
    title: "Toko, Pesanan & Barang Masuk",
    body:
      "Menu Toko punya 3 sub-tab. (1) Toko: data supplier — tambah nama/alamat/telepon. (2) Pesanan: buat pesanan pembelian ke toko → pilih toko → tambah item (barang, qty, harga) → simpan. Cetak Bon via tombol Cetak. Upload foto bon/nota fisik sebagai arsip. Saat barang datang, ubah status jadi Diterima. (3) Barang Masuk: catat barang yang diterima → otomatis masuk ke stok inventaris.",
  },
  {
    id: "kib",
    title: "KIB (Kartu Inventaris Barang)",
    body:
      "Pilih kategori via tab: A (Tanah), B (Peralatan & Mesin), C (Gedung & Bangunan), D (Jalan/Irigasi/Jaringan), E (Aset Lain), F (Konstruksi Dalam Pengerjaan). Klik \"Tambah Aset\" → isi data (nama, kode, tahun perolehan, nilai, kondisi, sumber dana). Tombol Cetak untuk mencetak Kartu Inventaris per kategori.",
  },
  {
    id: "inventaris",
    title: "Inventaris (Gedung, Ruang, Barang)",
    body:
      "3 sub-tab. (1) Gedung: data gedung sekolah. (2) Ruang: ruangan per gedung (kelas, lab, kantor, gudang). (3) Barang di Ruang: daftar barang per ruang — bisa dari Barang Masuk atau input manual. Filter per gedung/ruang. Cetak daftar barang per ruang untuk opname (stock opname) berkala.",
  },
  {
    id: "gaji",
    title: "Gaji & Honor",
    body:
      "Pastikan data pegawai sudah diinput. Buka Gaji → pilih tahun → klik Cetak. Di dialog: pilih Status (filter kategori), centang bulan yang dibayar, centang pegawai, pilih orientasi (Portrait/Landscape), pilih mode: Tanda Tangan (7 kolom, ada kolom tanda tangan) atau Bank (6 kolom, untuk submit ke bank). Atur tanggal & tempat → Cetak. Dokumen terbuka di tab baru → Simpan sebagai PDF. GTTS → jumlah les, satuan JPL. PTTS/Petugas/Penjaga → satuan OB. Bukti pembayaran: klik Bayar → pilih bulan → Upload Bukti (foto transfer, max 5 foto, support kamera HP). Nama file PDF otomatis: Gaji_[Status]_[Bulan] [Tahun].",
  },
  {
    id: "media",
    title: "Media (Iuran Koran & Majalah)",
    body:
      "Tambah Media: Nama Pemilik, Nama Media, Jenis Pembayaran, Harga per Bulan. Cetak: klik Cetak → pilih tahun, centang media & bulan, atur tanggal/tempat → Cetak. Dokumen \"Daftar Pembayaran Iuran Koran dan Majalah\" terbuka. Bukti pembayaran: klik Bayar → pilih bulan → Upload Bukti. Nama file PDF: [Nama Pemilik]_[Bulan] [Tahun] (multi-pemilik → \"Pertama dkk_...\").",
  },
  {
    id: "cetak",
    title: "Mencetak Dokumen",
    body:
      "Dokumen yang bisa dicetak: Gaji (Tanda Terima Honor), Media (Daftar Pembayaran), Pesanan (Bon), KIB (per kategori), Inventaris (per ruang). KOP & watermark otomatis dari Pengaturan. Judul otomatis fit 1 baris. Penandatangan otomatis (Kepala Sekolah/Bendahara/Pengurus Barang). Saat pilih Landscape, klik \"Cetak Sekarang\" di banner kuning, lalu pilih Landscape di dialog cetak browser. Nama file PDF otomatis mengikuti format per fitur.",
  },
  {
    id: "pwa",
    title: "Install di Android (PWA)",
    body:
      "Aplikasi bisa diinstall di Android/iOS seperti aplikasi native, dengan LOGO SEKOLAH sebagai ikon. Android (Chrome): buka aplikasi → tunggu tombol \"Pasang Aplikasi\" muncul di pojok kanan bawah (atau menu ⋮ → Tambahkan ke layar utama) → Pasang. iOS (Safari): Share → Tambahkan ke Layar Utama. Ikon mengikuti Logo Aplikasi/Favicon di Pengaturan. Ganti logo di Pengaturan → ikon berubah (mungkin perlu uninstall+reinstall di HP untuk refresh cache). Saat dibuka, app fullscreen tanpa address bar browser.",
  },
  {
    id: "excel",
    title: "Impor & Ekspor Excel",
    body:
      "Ekspor: Gaji → Export Excel (Database_Gaji.xlsx), Media → Export Excel (Daftar_Media.xlsx) — semua data terbaru, untuk backup. Impor: Gaji → Impor Excel → pilih .xlsx/.xls (format harus sama template, baris judul & footer GTTS/PTTS otomatis dilewati). Download Template untuk format kosong.",
  },
  {
    id: "faq",
    title: "FAQ & Pemecahan Masalah",
    body:
      "Dialog cetak tertutup saat klik dropdown? Sudah diperbaiki — refresh halaman jika masih. Tombol cetak macet? Sudah diperbaiki — refresh. Logo tidak tampil di cetak? Cek Pengaturan → Logo sudah diupload & disimpan. Ikon Android tidak berubah? Uninstall app di HP → clear cache Chrome → install ulang. Cetak PDF terpotong? Pilih Landscape untuk tabel lebar, margin cetak browser ke None/Minimum. Aplikasi blank? Pastikan server jalan, coba browser lain, clear cache.",
  },
];

export function PanduanDialog({ open, onOpenChange }: PanduanDialogProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5 text-primary" />
            Panduan Penggunaan
          </DialogTitle>
          <DialogDescription>
            Ringkasan cara menggunakan setiap fitur SIMAPRAS. Ketik kata kunci
            untuk mencari.
          </DialogDescription>
        </DialogHeader>

        {/* Search bar */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari fitur... (mis. gaji, cetak, install, logo)"
              className="pl-9"
              aria-label="Cari panduan"
            />
          </div>
        </div>

        {/* Content — accordion list, scrollable */}
        <ScrollArea className="flex-1 max-h-[55vh]">
          <div className="px-6 py-4">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Tidak ada hasil untuk &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {filtered.map((s, idx) => (
                  <AccordionItem
                    key={s.id}
                    value={s.id}
                    className={idx === filtered.length - 1 ? "border-b-0" : ""}
                  >
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                      {s.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
