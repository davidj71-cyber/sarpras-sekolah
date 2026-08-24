// ─── Terbilang: konversi angka → teks Bahasa Indonesia ─────────────────────────
// Mengubah angka (number) menjadi kata-kata dalam Bahasa Indonesia.
// Contoh: 150000 → "Seratus Lima Puluh Ribu Rupiah"
//
// Mendukung hingga triliun. Untuk nilai 0 mengembalikan "Nol Rupiah".

const SATUAN = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
  'Sepuluh', 'Sebelas',
]

function terbilangBasic(n: number): string {
  if (n < 0) return 'Minus ' + terbilangBasic(Math.abs(n))
  if (n < 12) return SATUAN[n]
  if (n < 20) return terbilangBasic(n - 10) + ' Belas'
  if (n < 100) {
    const puluh = Math.floor(n / 10)
    const sisa = n % 10
    return (puluh === 1 ? 'Sepuluh' : terbilangBasic(puluh) + ' Puluh') + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 200) {
    const sisa = n - 100
    return 'Seratus' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 1000) {
    const ratus = Math.floor(n / 100)
    const sisa = n % 100
    return (ratus === 1 ? 'Seratus' : terbilangBasic(ratus) + ' Ratus') + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 2000) {
    const sisa = n - 1000
    return 'Seribu' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 1000000) {
    const ribu = Math.floor(n / 1000)
    const sisa = n % 1000
    return terbilangBasic(ribu) + ' Ribu' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 1000000000) {
    const juta = Math.floor(n / 1000000)
    const sisa = n % 1000000
    return terbilangBasic(juta) + ' Juta' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  if (n < 1000000000000) {
    const miliar = Math.floor(n / 1000000000)
    const sisa = n % 1000000000
    return terbilangBasic(miliar) + ' Miliar' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
  }
  const triliun = Math.floor(n / 1000000000000)
  const sisa = n % 1000000000000
  return terbilangBasic(triliun) + ' Triliun' + (sisa > 0 ? ' ' + terbilangBasic(sisa) : '')
}

/**
 * Konversi angka ke terbilang rupiah dalam Bahasa Indonesia.
 * @param value angka yang akan dikonversi
 * @returns string terbilang dengan akhiran "Rupiah", contoh: "Seratus Lima Puluh Ribu Rupiah"
 */
export function terbilangRupiah(value: number): string {
  const absValue = Math.abs(Math.round(value))
  if (absValue === 0) return 'Nol Rupiah'
  return terbilangBasic(absValue) + ' Rupiah'
}
