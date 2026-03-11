-- Initial SQLite Schema for Offline-First Sync
-- Mirrors core Prisma models

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'STAF',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sop_files (
  id TEXT PRIMARY KEY,
  nomorSop TEXT UNIQUE,
  judul TEXT NOT NULL,
  tahun INTEGER,
  kategori TEXT,
  jenis TEXT,
  status TEXT DEFAULT 'AKTIF',
  fileName TEXT,
  filePath TEXT,
  fileType TEXT,
  uploadedBy TEXT,
  isPublicSubmission BOOLEAN DEFAULT 0,
  sync_status TEXT DEFAULT 'synced', -- synced, pending, error
  last_synced_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sop_pembuatan (
  id TEXT PRIMARY KEY,
  nomorSop TEXT UNIQUE,
  judul TEXT NOT NULL,
  unitKerja TEXT,
  tanggalEfektif DATETIME,
  revisi TEXT,
  status TEXT DEFAULT 'DRAFT',
  authorId TEXT,
  sync_status TEXT DEFAULT 'synced',
  last_synced_at DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sop_langkah (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL,
  aktivitas TEXT NOT NULL,
  pelaksana TEXT,
  stepType TEXT DEFAULT 'process',
  sopPembuatanId TEXT,
  sync_status TEXT DEFAULT 'synced',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sopPembuatanId) REFERENCES sop_pembuatan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sop_flowchart (
  id TEXT PRIMARY KEY,
  sopId TEXT UNIQUE,
  flowchartJson TEXT,
  sync_status TEXT DEFAULT 'synced',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sopId) REFERENCES sop_pembuatan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE
  data TEXT,            -- JSON string
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, processing, synced, error
  synced_at DATETIME,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_timestamp ON sync_queue(timestamp);
