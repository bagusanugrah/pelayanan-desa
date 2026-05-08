require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { drizzle } = require('drizzle-orm/mysql2');
const { eq } = require('drizzle-orm');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Inisialisasi Client S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Import skema dan middleware
const { users, surats, pengaduans } = require('./db/schema');
const authenticate = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Database
const poolConnection = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(poolConnection);

// Statis folder untuk akses PDF hasil approve
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 1. AUTENTIKASI (REGISTER & LOGIN)
// ==========================================

app.post('/api/register', async (req, res) => {
  try {
    const { nik, nama, password } = req.body;
    const existing = await db.select().from(users).where(eq(users.nik, nik));
    if (existing.length > 0) return res.status(400).json({ error: "NIK sudah terdaftar!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(users).values({ nik, nama, password: hashedPassword });
    res.status(201).json({ message: "Registrasi sukses!" });
  } catch (err) {
    res.status(500).json({ error: "Gagal registrasi." });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { nik_or_username, password } = req.body;
    
    // Login Admin (Hardcoded .env)
    if (nik_or_username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ id: 0, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, role: 'admin' });
    }

    // Login Masyarakat
    const userResult = await db.select().from(users).where(eq(users.nik, nik_or_username));
    if (userResult.length === 0) return res.status(400).json({ error: "User tidak ditemukan" });
    
    const isMatch = await bcrypt.compare(password, userResult[0].password);
    if (!isMatch) return res.status(400).json({ error: "Password salah" });

    const token = jwt.sign({ id: userResult[0].id, nik: userResult[0].nik, role: 'masyarakat' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: 'masyarakat', nama: userResult[0].nama });
  } catch (err) {
    res.status(500).json({ error: "Gagal login." });
  }
});

// ==========================================
// 2. SISTEM SURAT (PENGAJUAN & LIST)
// ==========================================

// Masyarakat Mengajukan (Hanya Simpan Data)
app.post('/api/surat', authenticate, async (req, res) => {
  try {
    const { jenisSurat, keperluan } = req.body;
    
    // Pastikan ini INSERT, bukan SELECT
    await db.insert(surats).values({
      jenisSurat,
      keperluan,
      userId: req.user.id,
      status: 'pending'
    });

    res.status(201).json({ message: "Pengajuan terkirim!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengirim pengajuan." });
  }
});

// Mengambil Daftar Surat (Masyarakat: Milik sendiri, Admin: Semua)
app.get('/api/surat', authenticate, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      // JOIN tabel surats dengan tabel users berdasarkan ID
      result = await db.select({
      id: surats.id,          // <--- WAJIB ADA untuk identitas hapus/edit
      status: surats.status,  // <--- WAJIB ADA agar tombol muncul sesuai kondisi
      jenisSurat: surats.jenisSurat,
      keperluan: surats.keperluan,
      fileUrl: surats.fileUrl,
      nik: users.nik,
      nama: users.nama
    })
    .from(surats)
    .innerJoin(users, eq(surats.userId, users.id));
    } else {
      result = await db.select().from(surats).where(eq(surats.userId, req.user.id));
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data surat." });
  }
});

// ==========================================
// 3. ADMIN APPROVAL & GENERATE PDF
// ==========================================
app.put('/api/surat/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Bukan Admin" });
    
    const { status } = req.body;
    const id = parseInt(req.params.id);

    // 1. Jika ditolak, langsung update status dan selesai
    if (status === 'rejected') {
      await db.update(surats).set({ status }).where(eq(surats.id, id));
      return res.json({ message: "Surat ditolak" });
    }

    // 2. Ambil data pendukung untuk isi surat
    const dataSurat = await db.select().from(surats).where(eq(surats.id, id));
    if (dataSurat.length === 0) return res.status(404).json({ error: "Data tidak ditemukan" });
    
    const dataUser = await db.select().from(users).where(eq(users.id, dataSurat[0].userId));

    // 3. PROSES GENERATE PDF KE MEMORI (BUFFER)
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Penampung data PDF
    let chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Bungkus proses S3 ke dalam Promise agar kita bisa "await" sampai selesai
    const uploadResult = await new Promise((resolve, reject) => {
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `Surat_Sah_${id}_${Date.now()}.pdf`;

        try {
          // --- UNGGAH KE S3 ---
          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
          }));

          // Link yang disimpan adalah URL CloudFront
          const cloudFrontUrl = `${process.env.CLOUDFRONT_URL}/${fileName}`;
          resolve(cloudFrontUrl);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      // --- MULAI GAMBAR PDF (Sama seperti desain sebelumnya) ---
      doc.fontSize(14).font('Helvetica-Bold').text('PEMERINTAH KABUPATEN DIGITAL', { align: 'center' });
      doc.fontSize(16).text('KECAMATAN CLOUD COMPUTING', { align: 'center' });
      doc.fontSize(18).text('KANTOR KEPALA DESA FULLSTACK', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Jl. Raya Kode No. 152022029, Bandung - Jawa Barat', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.lineWidth(2).moveTo(50, 115).lineTo(545, 115).stroke();
      doc.lineWidth(0.5).moveTo(50, 118).lineTo(545, 118).stroke();

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text(`SURAT KETERANGAN ${dataSurat[0].jenisSurat.toUpperCase()}`, { align: 'center', underline: true });
      doc.fontSize(11).font('Helvetica').text(`Nomor: 470 / ${id} / DS-FS / 2026`, { align: 'center' });

      doc.moveDown(2);
      doc.fontSize(12).text('Yang bertanda tangan di bawah ini Kepala Desa Fullstack, menerangkan bahwa:', { align: 'justify' });
      
      doc.moveDown();
      doc.text('Nama', 70).text(`:  ${dataUser[0].nama}`, 180);
      doc.text('NIK', 70).text(`:  ${dataUser[0].nik}`, 180);
      doc.text('Jenis Surat', 70).text(`:  ${dataSurat[0].jenisSurat}`, 180);
      doc.text('Keperluan', 70).text(`:  ${dataSurat[0].keperluan}`, 180);

      doc.moveDown(2);
      doc.text('Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.', { align: 'justify' });

      doc.moveDown(3);
      const dateNow = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Bandung, ${dateNow}`, 350, doc.y, { align: 'center' });
      doc.text('Kepala Desa Fullstack,', 350, doc.y + 15, { align: 'center' });
      doc.moveDown(4);
      doc.font('Helvetica-Bold').text('( ............................................ )', 350, doc.y, { align: 'center' });

      doc.fontSize(8).fillColor('blue').text('SURAT INI TELAH DISETUJUI SECARA DIGITAL Melalui AWS S3 & CLOUDFRONT', 50, 750);
      
      // Akhiri dokumen
      doc.end();
    });

    // 4. Update Database dengan URL CloudFront
    await db.update(surats)
      .set({ status: 'approved', fileUrl: uploadResult })
      .where(eq(surats.id, id));

    res.json({ message: "Surat disetujui, diunggah ke S3, dan PDF terbit!", fileUrl: uploadResult });

  } catch (err) {
    console.error("Error Approval:", err);
    res.status(500).json({ error: "Gagal memproses persetujuan surat." });
  }
});

// ==========================================
// 4. SISTEM PENGADUAN
// ==========================================
app.get('/api/pengaduan', authenticate, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      // JOIN tabel pengaduans dengan users
      result = await db.select({
        id: pengaduans.id,
        judul: pengaduans.judul,
        deskripsi: pengaduans.deskripsi,
        status: pengaduans.status,
        userId: pengaduans.userId,
        nik: users.nik,
        nama: users.nama
      })
      .from(pengaduans)
      .innerJoin(users, eq(pengaduans.userId, users.id));
    } else {
      result = await db.select().from(pengaduans).where(eq(pengaduans.userId, req.user.id));
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data pengaduan." });
  }
});

// Masyarakat Mengirim Pengaduan
app.post('/api/pengaduan', authenticate, async (req, res) => {
  try {
    const { judul, deskripsi } = req.body;
    
    await db.insert(pengaduans).values({ 
      judul, 
      deskripsi, 
      userId: req.user.id,
      status: 'pending' 
    });

    res.status(201).json({ message: "Pengaduan terkirim!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal kirim pengaduan." });
  }
});

// ==========================================
// ENDPOINT: HAPUS PENGAJUAN SURAT
// ==========================================
app.delete('/api/surat/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // 1. Cari data surat untuk mendapatkan link file di S3
    const dataSurat = await db.select().from(surats).where(eq(surats.id, id));
    if (dataSurat.length === 0) return res.status(404).json({ error: "Data tidak ditemukan." });

    const surat = dataSurat[0];

    // 2. Validasi Hak Akses
    if (req.user.role !== 'admin') {
      if (surat.userId !== req.user.id) return res.status(403).json({ error: "Akses ditolak." });
      if (surat.status !== 'pending') return res.status(400).json({ error: "Surat sudah diproses, tidak bisa dihapus." });
    }

    // 3. HAPUS FILE DARI AWS S3 (Jika sudah di-approve dan ada filenya)
    if (surat.fileUrl) {
      try {
        // Ambil nama file (Key) dari URL CloudFront
        // Contoh: https://dxxxx.cloudfront.net/Surat_Sah_9.pdf -> Surat_Sah_9.pdf
        const fileName = surat.fileUrl.split('/').pop();

        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: fileName
        }));
        
        console.log(`File ${fileName} berhasil dihapus dari S3`);
      } catch (s3Error) {
        // Kita log saja errornya agar proses hapus di DB tetap lanjut jika file di S3 gagal (misal file sudah tidak ada)
        console.error("Gagal menghapus file di S3:", s3Error);
      }
    }

    // 4. Hapus data dari Database
    await db.delete(surats).where(eq(surats.id, id));

    res.json({ message: "Data pengajuan dan file di S3 berhasil dihapus permanen." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus data." });
  }
});

// ==========================================
// ENDPOINT: HAPUS PENGADUAN
// ==========================================
app.delete('/api/pengaduan/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // 1. Cari data pengaduan
    const dataPengaduan = await db.select().from(pengaduans).where(eq(pengaduans.id, id));
    if (dataPengaduan.length === 0) return res.status(404).json({ error: "Pengaduan tidak ditemukan." });

    const pengaduan = dataPengaduan[0];

    // 2. Validasi Hak Akses
    if (req.user.role !== 'admin') {
      // Masyarakat: Cek kepemilikan dan status
      if (pengaduan.userId !== req.user.id) return res.status(403).json({ error: "Akses ditolak." });
      if (pengaduan.status !== 'pending') {
        return res.status(400).json({ error: "Laporan yang sedang diproses tidak bisa dihapus." });
      }
    }

    // 3. Eksekusi Hapus
    await db.delete(pengaduans).where(eq(pengaduans.id, id));

    res.json({ message: "Pengaduan berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus pengaduan." });
  }
});

// ==========================================
// ENDPOINT: UPDATE STATUS PENGADUAN (ADMIN)
// ==========================================
app.put('/api/pengaduan/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Bukan Admin" });
    
    const id = parseInt(req.params.id);
    const { status } = req.body; // Kita kirim 'selesai' dari frontend

    await db.update(pengaduans)
      .set({ status })
      .where(eq(pengaduans.id, id));

    res.json({ message: "Laporan pengaduan telah diselesaikan." });
  } catch (err) {
    res.status(500).json({ error: "Gagal memperbarui status pengaduan." });
  }
});

// Endpoint untuk cek status server (Health Check)
app.get('/', (req, res) => {
  res.status(200).json({ message: "Backend Pelayanan Desa API is Running!" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Backend meluncur di port ${PORT}`));