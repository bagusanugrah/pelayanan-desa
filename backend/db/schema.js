const { mysqlTable, serial, varchar, text, timestamp, int } = require('drizzle-orm/mysql-core');

const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  nik: varchar('nik', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('masyarakat'),
});

const surats = mysqlTable('surats', {
  id: serial('id').primaryKey(),
  jenisSurat: varchar('jenis_surat', { length: 100 }).notNull(),
  keperluan: text('keperluan').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, approved, rejected
  fileUrl: varchar('file_url', { length: 255 }),
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

const pengaduans = mysqlTable('pengaduans', {
  id: serial('id').primaryKey(),
  judul: varchar('judul', { length: 255 }).notNull(),
  deskripsi: text('deskripsi').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, diproses, selesai
  userId: int('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

module.exports = { users, surats, pengaduans };