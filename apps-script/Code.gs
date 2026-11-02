/**
 * Penerima jawaban diskusi Peta Regulasi Ekspor CPO
 * Mata kuliah Transportasi Multimoda, Poltrada Bali
 *
 * Cara pakai singkat (panduan lengkap ada di README.md):
 * 1. Tempel file ini di Extensions > Apps Script pada Google Sheet Anda.
 * 2. Isi Script Properties: ADMIN_KEY (kata sandi halaman admin).
 * 3. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * 4. Salin URL Web app ke SCRIPT_URL di index.html dan admin.html.
 */

const SHEET_NAME = 'Jawaban';
const HEADERS = ['Waktu', 'Nomor Absen', 'Nama Lengkap', 'Notar', 'Kelas', 'Jawaban 1', 'Jawaban 2', 'Jawaban 3'];
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

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'Server sedang sibuk. Kirim ulang dalam beberapa detik.' });
  try {
    const sh = getSheet();
    const now = new Date();
    const row = [now, absen, nama, notar, kelas, q1, q2, q3];
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
    q1: String(r[5]), q2: String(r[6]), q3: String(r[7])
  }));
  return reply({ ok: true, headers: HEADERS, rows: data });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    // Kolom teks agar Notar dan Nomor Absen tidak berubah format.
    sh.getRange('B:E').setNumberFormat('@');
  }
  return sh;
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
