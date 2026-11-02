/**
 * Penerima jawaban diskusi Peta Regulasi Ekspor CPO
 * Mata kuliah Transportasi Multimoda, Poltrada Bali
 *
 * Cara pakai singkat (panduan lengkap ada di README.md):
 * 1. Tempel file ini di Extensions > Apps Script pada Google Sheet Anda.
 * 2. Isi Script Properties: ADMIN_KEY (kata sandi halaman admin) dan
 *    KUNCI_PG (kunci pilihan ganda, 10 huruf A-D tanpa spasi, contoh ABCDABCDAB).
 *    Kunci sengaja tidak ditulis di file ini karena repo GitHub bersifat publik.
 * 3. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * 4. Salin URL Web app ke SCRIPT_URL di index.html dan admin.html.
 */

const SHEET_NAME = 'Jawaban';
const JUMLAH_PG = 10;
const PG_HEADERS = Array.from({ length: JUMLAH_PG }, (_, i) => 'PG' + (i + 1));
const HEADERS = ['Waktu', 'Nomor Absen', 'Nama Lengkap', 'Notar', 'Kelas', 'Jawaban 1', 'Jawaban 2', 'Jawaban 3', 'Skor PG'].concat(PG_HEADERS);
const MAX_LEN = { absen: 3, nama: 80, notar: 20, kelas: 20, jawaban: 5000 };

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false, error: 'Format kiriman tidak dikenali.' });
  }
  if (body.action === 'export') return exportRows(body);
  return saveAnswer(body);
}

function doGet() {
  return reply({ ok: true, info: 'Penerima jawaban aktif. Kirim jawaban lewat halaman formulir.' });
}

function saveAnswer(b) {
  // Honeypot: kolom tersembunyi hanya diisi bot.
  if (b.website) return reply({ ok: true });

  const absen = clean(b.absen, MAX_LEN.absen);
  const nama = clean(b.nama, MAX_LEN.nama);
  const notar = clean(b.notar, MAX_LEN.notar);
  const kelas = clean(b.kelas, MAX_LEN.kelas);
  const q1 = clean(b.q1, MAX_LEN.jawaban);
  const q2 = clean(b.q2, MAX_LEN.jawaban);
  const q3 = clean(b.q3, MAX_LEN.jawaban);

  if (!/^[0-9]{1,3}$/.test(absen)) return reply({ ok: false, error: 'Nomor Absen hanya berisi angka.' });
  if (nama.length < 3 || notar.length < 3 || kelas.length < 2) return reply({ ok: false, error: 'Lengkapi Nama Lengkap, Notar, dan Kelas.' });
  if (q1.length < 10 || q2.length < 10 || q3.length < 10) return reply({ ok: false, error: 'Tiap jawaban minimal 10 karakter.' });

  const pg = Array.isArray(b.pg) ? b.pg.map(v => String(v || '').trim().toUpperCase()) : [];
  if (pg.length !== JUMLAH_PG || pg.some(v => !/^[ABCD]$/.test(v))) return reply({ ok: false, error: 'Jawab semua soal pilihan ganda.' });
  const skor = hitungSkor(pg);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'Server sedang sibuk. Kirim ulang dalam beberapa detik.' });
  try {
    const sh = getSheet();
    const now = new Date();
    const row = [now, absen, nama, notar, kelas, q1, q2, q3, skor].concat(pg);
    // Satu baris per Notar: kiriman baru menimpa kiriman lama.
    const last = sh.getLastRow();
    let target = 0;
    if (last > 1) {
      const notars = sh.getRange(2, 4, last - 1, 1).getDisplayValues();
      for (let i = 0; i < notars.length; i++) {
        if (String(notars[i][0]).trim().toUpperCase() === notar.toUpperCase()) { target = i + 2; break; }
      }
    }
    if (target) sh.getRange(target, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return reply({ ok: true, waktu: now.toISOString(), diperbarui: !!target });
  } finally {
    lock.releaseLock();
  }
}

function exportRows(b) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key) return reply({ ok: false, error: 'ADMIN_KEY belum diisi di Script Properties.' });
  if (String(b.key || '') !== key) {
    Utilities.sleep(1500); // memperlambat tebakan kata sandi
    return reply({ ok: false, error: 'Kata sandi salah.' });
  }
  const sh = getSheet();
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  const data = rows.map(r => ({
    waktu: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    absen: String(r[1]), nama: String(r[2]), notar: String(r[3]), kelas: String(r[4]),
    q1: String(r[5]), q2: String(r[6]), q3: String(r[7]),
    skor: r[8] === '' ? '' : Number(r[8]),
    pg: r.slice(9, 9 + JUMLAH_PG).map(String)
  }));
  return reply({ ok: true, headers: HEADERS, rows: data });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  const lastCol = sh.getLastColumn();
  if (sh.getLastRow() > 0 && lastCol < HEADERS.length) {
    // Sheet lama (8 kolom): tambahkan judul kolom pilihan ganda.
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    // Kolom teks agar Notar dan Nomor Absen tidak berubah format.
    sh.getRange('B:E').setNumberFormat('@');
  }
  return sh;
}

function hitungSkor(pg) {
  const kunci = String(PropertiesService.getScriptProperties().getProperty('KUNCI_PG') || '').toUpperCase().replace(/[^ABCD]/g, '');
  if (kunci.length !== JUMLAH_PG) return '';
  let benar = 0;
  for (let i = 0; i < JUMLAH_PG; i++) if (pg[i] === kunci[i]) benar++;
  return benar * (100 / JUMLAH_PG);
}

/** Hitung ulang Skor PG semua baris, misalnya setelah kunci diperbaiki. Jalankan dari editor. */
function hitungUlangSkor() {
  const sh = getSheet();
  const last = sh.getLastRow();
  if (last < 2) return;
  const range = sh.getRange(2, 10, last - 1, JUMLAH_PG);
  const skor = range.getDisplayValues().map(r => [r.every(v => v) ? hitungSkor(r.map(v => v.toUpperCase())) : '']);
  sh.getRange(2, 9, last - 1, 1).setValues(skor);
}

function clean(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  // Cegah formula spreadsheet: teks yang diawali = + - @ diberi tanda kutip.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan sekali dari editor untuk membuat sheet dan header. */
function siapkanSheet() {
  getSheet();
}
