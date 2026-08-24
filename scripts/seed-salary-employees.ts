import { db } from '@/lib/db'

// ─── Daftar Pegawai (dari PDF "DAFTAR GTTS DAN PTTS SMAN 1 TELUKDALAM") ───────
// Sumber: /home/z/my-project/upload/daftar Pegawai.pdf (23 pegawai)
// Kolom PDF: NO, NAMA, NO. REKENING TABUNGAN (berisi NIP), JABATAN,
//            JUMLAH BULAN/JAM PELAJARAN, SATUAN (JPL/OB),
//            HARGA SATUAN, PENERIMAAN BERSIH, STATUS (GTTS/PTTS)
//
// Catatan:
// - Kolom "NO. REKENING TABUNGAN" di PDF sebenarnya berisi NIP (format 271.02.04.XXXXXX-X),
//   jadi dimasukkan ke field `nip`. Field `bankAccount` dibiarkan kosong.
// - `status` = kode kategori pendek (GTTS / PTTS).
// - `jabatan` = peran spesifik; kosong jika PDF tidak mencantumkan.
// - Harga ditulis tanpa pemisah ribuan (60000, bukan 60.000).
// - `period` dikosongkan — akan diisi user saat membentuk pembayaran bulanan.

interface PdfRow {
  no: number
  name: string
  nip: string
  jabatan: string
  lessonCount: number
  unit: string // JPL | OB
  pricePerLesson: number
  status: string // GTTS | PTTS
}

const ROWS: PdfRow[] = [
  { no: 1,  name: 'SELATIELI NEHE, S.PD',                nip: '271.02.04.019425-0', jabatan: '',                       lessonCount: 39, unit: 'JPL', pricePerLesson: 60000,  status: 'GTTS' },
  { no: 2,  name: 'ARIFIN METODI BATEE, S.PD',           nip: '271.02.04.022119-0', jabatan: '',                       lessonCount: 34, unit: 'JPL', pricePerLesson: 60000,  status: 'GTTS' },
  { no: 3,  name: 'FERDIWATI WAU, S.PD',                 nip: '271.02.04.019428-0', jabatan: '',                       lessonCount: 32, unit: 'JPL', pricePerLesson: 60000,  status: 'GTTS' },
  { no: 4,  name: 'NONI ALFANITA SARUMAHA, S.PD',        nip: '271.02.04.034078-5', jabatan: '',                       lessonCount: 10, unit: 'JPL', pricePerLesson: 60000,  status: 'GTTS' },
  { no: 5,  name: 'EMILA HAFO, S.PD',                    nip: '271.02.04.032793-7', jabatan: '',                       lessonCount: 32, unit: 'JPL', pricePerLesson: 60000,  status: 'GTTS' },
  { no: 6,  name: 'ASEP NURHIDAYAT, S.Pd.I',             nip: '271.02.04.034928-3', jabatan: '',                       lessonCount: 15, unit: 'JPL', pricePerLesson: 50000,  status: 'GTTS' },
  { no: 7,  name: "ESTERA NEHE, S.PD",                   nip: '271.02.04.020844-0', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2000000, status: 'PTTS' },
  { no: 8,  name: "HATIELI BU'ULOLO, S.PD",              nip: '271.02.04.020859-0', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2500000, status: 'PTTS' },
  { no: 9,  name: 'DAVID J. SITINJAK, S.PD',             nip: '271.02.04.031552-0', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2500000, status: 'PTTS' },
  { no: 10, name: 'SIONA ZIRALUO, S.Kom',                nip: '271.02.04.034478-6', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2000000, status: 'PTTS' },
  { no: 11, name: 'MERDINA ZIRALUO, S.PD',               nip: '271.02.04.000781-9', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2500000, status: 'PTTS' },
  { no: 12, name: 'GERARDUS SAFRIL SARUMAHA, S.Kom',     nip: '271.02.04.035851-2', jabatan: '',                       lessonCount: 1,  unit: 'OB',  pricePerLesson: 2000000, status: 'PTTS' },
  { no: 13, name: 'Sadamani Laia, S.Pd',                 nip: '271.02.04.017834-0', jabatan: 'HONORER SEKOLAH',        lessonCount: 30, unit: 'JPL', pricePerLesson: 50000,  status: 'PTTS' },
  { no: 14, name: 'Meido Brillian Surbakti, S.Pd',       nip: '271.02.04.038792-0', jabatan: 'GURU SEMENTARA',         lessonCount: 30, unit: 'JPL', pricePerLesson: 35000,  status: 'PTTS' },
  { no: 15, name: 'NOVIKA EFDIMASARI HALAWA, S.S.I',     nip: '271.02.04.038791-9', jabatan: 'PTTS',                   lessonCount: 1,  unit: 'OB',  pricePerLesson: 2000000, status: 'GTTS' },
  { no: 16, name: 'FARREL JOEL PRASETYA NDRAHA',         nip: '',                   jabatan: 'PETUGAS KEBERSIHAN',     lessonCount: 1,  unit: 'OB',  pricePerLesson: 500000,  status: 'PTTS' },
  { no: 17, name: 'Kevin Marchell Gulo, S.Sn',           nip: '',                   jabatan: 'GURU SEMENTARA',         lessonCount: 26, unit: 'JPL', pricePerLesson: 35000,  status: 'GTTS' },
  { no: 18, name: "Asrinawati Ge'e, S.Kom",              nip: '271.02.04.039953-1', jabatan: 'GTTS',                   lessonCount: 26, unit: 'JPL', pricePerLesson: 35000,  status: 'GTTS' },
  { no: 19, name: 'Wirna Aceh',                          nip: '',                   jabatan: 'GURU SEMENTARA',         lessonCount: 18, unit: 'JPL', pricePerLesson: 35000,  status: 'GTTS' },
  { no: 20, name: 'NELPI K. WATI GOHAE, S.Pd.',          nip: '271.02.04.039588-2', jabatan: 'HONORER SEKOLAH',        lessonCount: 28, unit: 'JPL', pricePerLesson: 50000,  status: 'GTTS' },
  { no: 21, name: 'Arif Trisman Daniel Laia, S.Si',      nip: '271.02.05.006143-5', jabatan: 'GURU SEMENTARA',         lessonCount: 28, unit: 'JPL', pricePerLesson: 35000,  status: 'GTTS' },
  { no: 22, name: 'AMPUNI DACHI',                        nip: '',                   jabatan: 'PEGAWAI SEKOLAH',        lessonCount: 1,  unit: 'OB',  pricePerLesson: 1000000, status: 'PTTS' },
  { no: 23, name: 'Amonius Dakhi, S.Kom',                nip: '271.02.04.034078-5', jabatan: 'GURU SEMENTARA',         lessonCount: 24, unit: 'JPL', pricePerLesson: 35000,  status: 'GTTS' },
]

async function main() {
  console.log(`Seeding ${ROWS.length} pegawai into SalaryEntry...`)

  // Cek apakah sudah ada data — hindari duplikasi seed.
  const existing = await db.salaryEntry.count()
  if (existing > 0) {
    console.log(`SalaryEntry already has ${existing} rows. Aborting to avoid duplicates.`)
    console.log('If you want to reseed, truncate the table first:')
    console.log('  bun -e "import {db} from \'./src/lib/db.ts\'; await db.salaryEntry.deleteMany(); await db.\$disconnect();"')
    return
  }

  let created = 0
  for (const row of ROWS) {
    const totalReceived = row.lessonCount * row.pricePerLesson
    await db.salaryEntry.create({
      data: {
        name: row.name,
        nip: row.nip,
        bankAccount: '', // PDF tidak menyertakan nomor rekening sungguhan
        gender: 'L',     // default; user dapat mengedit kemudian
        status: row.status,
        jabatan: row.jabatan,
        lessonCount: row.lessonCount,
        unit: row.unit,
        pricePerLesson: row.pricePerLesson,
        totalReceived,
        period: '', // akan diisi user
      },
    })
    created++
    console.log(`  [${created}/${ROWS.length}] ${row.name} — ${row.status} — ${row.lessonCount} ${row.unit} × ${row.pricePerLesson} = ${totalReceived}`)
  }

  console.log(`\nDone. Created ${created} salary entries.`)
  console.log('Breakdown:')
  const gtts = ROWS.filter(r => r.status === 'GTTS').length
  const ptts = ROWS.filter(r => r.status === 'PTTS').length
  console.log(`  GTTS: ${gtts} pegawai`)
  console.log(`  PTTS: ${ptts} pegawai`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
