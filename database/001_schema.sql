-- ============================================================
-- DocScan AI – Supabase Schema
-- Project: yhpxqnkcltdocwqrcbcv
-- Run this in Supabase SQL Editor: Settings → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name     TEXT          NOT NULL,
  file_size     BIGINT,
  file_type     TEXT,
  storage_path  TEXT,
  public_url    TEXT,
  status        TEXT          NOT NULL DEFAULT 'uploaded'
                              CHECK (status IN ('uploaded','processing','completed','failed')),
  user_id       UUID,         -- optional auth integration
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ   -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_documents_status     ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_id    ON documents(user_id)  WHERE user_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 2. workflow_runs
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_runs (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID          NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workflow_type   TEXT          NOT NULL DEFAULT 'invoice_ocr',
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','triggered','processing','extracting','completed','failed')),
  n8n_execution_id TEXT,        -- n8n execution ID for tracing
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_document_id ON workflow_runs(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status      ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at  ON workflow_runs(created_at DESC);

CREATE TRIGGER set_workflow_runs_updated_at
  BEFORE UPDATE ON workflow_runs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 3. ocr_results
-- ============================================================
CREATE TABLE IF NOT EXISTS ocr_results (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id       UUID          NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workflow_run_id   UUID          REFERENCES workflow_runs(id) ON DELETE SET NULL,
  extracted_data    JSONB         NOT NULL DEFAULT '{}',
  raw_text          TEXT,
  confidence_score  FLOAT         CHECK (confidence_score >= 0 AND confidence_score <= 1),
  layout_tables     JSONB,        -- structured table data from document
  metadata          JSONB,        -- misc metadata from LLM
  model_used        TEXT,         -- e.g., 'gpt-4o', 'claude-3-5-sonnet'
  processing_ms     INTEGER,      -- how long the LLM call took
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_results_document_id ON ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_created_at  ON ocr_results(created_at DESC);
-- GIN index for fast JSONB querying
CREATE INDEX IF NOT EXISTS idx_ocr_results_extracted_data ON ocr_results USING GIN(extracted_data);

CREATE TRIGGER set_ocr_results_updated_at
  BEFORE UPDATE ON ocr_results
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 4. Storage Bucket
-- ============================================================
-- Run this to create the documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read of documents
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated or anonymous uploads
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents');

-- ============================================================
-- 5. Row Level Security (RLS)
-- ============================================================
-- Enable RLS (all access open for now — tighten when adding auth)
ALTER TABLE documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results    ENABLE ROW LEVEL SECURITY;

-- Open policies (replace with user-scoped policies once auth is added)
CREATE POLICY "Allow all on documents"     ON documents     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on workflow_runs" ON workflow_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ocr_results"   ON ocr_results   FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Realtime (enable for live status updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE ocr_results;

-- ============================================================
-- Seed: sample row to confirm schema works
-- ============================================================
-- (comment out in production)
-- INSERT INTO documents (file_name, file_size, file_type, status)
-- VALUES ('test-invoice.pdf', 102400, 'application/pdf', 'uploaded');
