import { db } from '@/lib/db'

// Default master options per category. These are seeded once so the comboboxes
// have sensible starting options; users can still add more inline.
const DEFAULT_OPTIONS: Record<string, string[]> = {
  satuan: [
    'Unit', 'Pcs', 'Buah', 'Set', 'Box', 'Pack', 'Lembar', 'Batang',
    'Meter', 'Kg', 'Gram', 'Liter', 'Roll', 'Pak', 'Pasang', 'Botol',
    'Btl', 'Lusin', 'Rim', 'Kotak', 'Tube', 'Sak',
  ],
  sumberDana: ['APBN', 'APBD', 'BOS', 'Donasi', 'Hibah', 'Sumbangan', 'Mandiri'],
  merk: [],
  bahan: ['Kayu', 'Besi', 'Plastik', 'Aluminium', 'Kaca', 'Kain', 'Kulit', 'Beton'],
  asalUsul: ['Pembelian', 'Donasi', 'Hibah', 'Sumbangan', 'Bawaan'],
  sumberBarang: ['Pembelian', 'Donasi', 'Hibah', 'Sumbangan', 'Bawaan'],
  jabatan: [
    'Kepala Sekolah', 'Wakil Kepala Sekolah', 'Bendahara', 'Tata Usaha',
    'Guru', 'Guru BK', 'Laboran', 'Pustakawan', 'Satpam', 'Petugas Kebersihan',
  ],
  unitKerja: [
    'Kepala Sekolah', 'Tata Usaha', 'Guru', 'Perpustakaan', 'Laboratorium',
    'Kesiswaan', 'Sarana Prasarana', 'Humas',
  ],
  jenisBarang: ['ATK', 'Elektronik', 'Furnitur', 'Pembersih', 'Laboratorium', 'Olahraga', 'Konsumsi'],
}

async function main() {
  console.log('Seeding master options...')
  let totalCreated = 0
  for (const [category, values] of Object.entries(DEFAULT_OPTIONS)) {
    for (const value of values) {
      try {
        await db.masterOption.create({ data: { category, value } })
        totalCreated++
      } catch {
        // already exists — skip
      }
    }
  }
  console.log(`Done. Created ${totalCreated} new options.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
