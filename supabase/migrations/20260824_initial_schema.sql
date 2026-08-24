-- =============================================================================
-- JKN Risk Intelligence Platform — Supabase PostgreSQL Database Schema
-- Compatible with PostgreSQL 15+, pgvector, and Supabase RLS
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- 1. Reference Data: Indonesian Provinces (34 Provinces)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provinces (
    province_code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    island_group VARCHAR(50) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. Providers: Healthcare Facilities (Hospitals / Clinics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS providers (
    provider_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'RS', 'KLINIK', 'PUSKESMAS'
    province_code VARCHAR(10) REFERENCES provinces(province_code),
    total_claims INTEGER DEFAULT 0,
    high_risk_claims INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    potential_exposure BIGINT DEFAULT 0,
    dominant_risk_type VARCHAR(50) DEFAULT 'UPCODING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Claims: Canonical Health Insurance Claims
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
    claim_id VARCHAR(50) PRIMARY KEY,
    sep_number VARCHAR(100) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_age INTEGER NOT NULL,
    patient_gender VARCHAR(10) NOT NULL,
    provider_id VARCHAR(50) NOT NULL REFERENCES providers(provider_id),
    service_date DATE NOT NULL,
    admission_date DATE,
    discharge_date DATE,
    length_of_stay INTEGER DEFAULT 1,
    inacbg_code VARCHAR(50) NOT NULL,
    inacbg_description TEXT NOT NULL,
    tariff BIGINT NOT NULL,
    standard_tariff BIGINT NOT NULL,
    potential_exposure BIGINT DEFAULT 0,
    severity_level INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'FLAGGED', 'VERIFIED_CORRECT', 'CONFIRMED_FRAUD'
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    risk_signals TEXT[] DEFAULT '{}', -- Array of risk types ['UPCODING', 'PHANTOM_BILLING', etc.]
    clinical_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Claim Diagnoses (ICD-10)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    severity INTEGER DEFAULT 1
);

-- -----------------------------------------------------------------------------
-- 5. Claim Procedures (ICD-9-CM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    procedure_date DATE
);

-- -----------------------------------------------------------------------------
-- 6. Medical Evidence Documents (Electronic Medical Records / CPPT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50) NOT NULL,
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'RESUME_MEDIS', 'CPPT_CATATAN', 'RINCIAN_BIAYA', 'LAPORAN_OPERASI'
    document_date TIMESTAMPTZ NOT NULL,
    doctor_name VARCHAR(255),
    department VARCHAR(100),
    content_preview TEXT NOT NULL,
    verified BOOLEAN DEFAULT TRUE,
    discrepancy TEXT,
    highlights TEXT[] DEFAULT '{}'
);

-- -----------------------------------------------------------------------------
-- 7. Claim Embeddings (pgvector for semantic clinical narrative similarity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    embedding vector(768),
    model_version VARCHAR(50) DEFAULT 'text-embedding-004',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. Risk Findings & Evidence Citations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    detector VARCHAR(100) NOT NULL,
    rule_id VARCHAR(50),
    severity VARCHAR(20) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    confidence DOUBLE PRECISION NOT NULL,
    delta_amount BIGINT DEFAULT 0,
    description TEXT NOT NULL,
    cited_document_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. Investigations: Case Workspaces
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigations (
    investigation_id VARCHAR(50) PRIMARY KEY,
    claim_id VARCHAR(50) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES providers(provider_id),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'PENDING_EVIDENCE', 'RESOLVED_VALID', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE'
    assigned_to VARCHAR(255) DEFAULT 'Senior Auditor',
    risk_score INTEGER DEFAULT 0,
    potential_exposure BIGINT DEFAULT 0,
    determination JSONB,
    findings JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    similar_cases JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. Investigation Notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id VARCHAR(50) NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. Investigation Reports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigation_reports (
    report_id VARCHAR(50) PRIMARY KEY,
    investigation_id VARCHAR(50) NOT NULL REFERENCES investigations(investigation_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    executive_summary TEXT NOT NULL,
    findings JSONB DEFAULT '[]'::jsonb,
    recommended_action VARCHAR(100) NOT NULL,
    final_amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. Immutable Audit Log (Append-only SHA-256 Ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id VARCHAR(50) NOT NULL,
    claim_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    justification TEXT,
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 13. Data Ingestion & Schema Mapping
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datasets (
    dataset_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    row_count INTEGER DEFAULT 0,
    canonical_count INTEGER DEFAULT 0,
    unmapped_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    mapped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id VARCHAR(50) NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
    source_field VARCHAR(100) NOT NULL,
    canonical_target VARCHAR(100) NOT NULL,
    sample_values TEXT[] DEFAULT '{}',
    confidence DOUBLE PRECISION DEFAULT 1.0,
    transform_rule VARCHAR(100) DEFAULT 'DIRECT',
    status VARCHAR(50) DEFAULT 'MAPPED'
);

-- -----------------------------------------------------------------------------
-- 14. Emerging Risk Signals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emerging_signals (
    signal_id VARCHAR(50) PRIMARY KEY,
    risk_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    change_percentage DOUBLE PRECISION DEFAULT 0.0,
    affected_providers_count INTEGER DEFAULT 1,
    potential_exposure BIGINT DEFAULT 0,
    confidence DOUBLE PRECISION DEFAULT 0.9,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    highlighted_claim_ids TEXT[] DEFAULT '{}'
);

-- =============================================================================
-- Indexes for Sub-Second Performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_claims_provider_risk ON claims (provider_id, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_claims_risk_level ON claims (risk_level);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims (status);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON investigations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investigations_claim ON investigations (claim_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_claim ON medical_documents (claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_claim ON audit_log (claim_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_providers_province ON providers (province_code);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emerging_signals ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous clients for demo evaluation
CREATE POLICY "Allow public read on provinces" ON provinces FOR SELECT USING (true);
CREATE POLICY "Allow public read on providers" ON providers FOR SELECT USING (true);
CREATE POLICY "Allow public read on claims" ON claims FOR SELECT USING (true);
CREATE POLICY "Allow public read on claim_diagnoses" ON claim_diagnoses FOR SELECT USING (true);
CREATE POLICY "Allow public read on claim_procedures" ON claim_procedures FOR SELECT USING (true);
CREATE POLICY "Allow public read on medical_documents" ON medical_documents FOR SELECT USING (true);
CREATE POLICY "Allow public read on risk_findings" ON risk_findings FOR SELECT USING (true);
CREATE POLICY "Allow public read on investigations" ON investigations FOR SELECT USING (true);
CREATE POLICY "Allow public read on investigation_notes" ON investigation_notes FOR SELECT USING (true);
CREATE POLICY "Allow public read on investigation_reports" ON investigation_reports FOR SELECT USING (true);
CREATE POLICY "Allow public read on audit_log" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Allow public read on datasets" ON datasets FOR SELECT USING (true);
CREATE POLICY "Allow public read on field_mappings" ON field_mappings FOR SELECT USING (true);
CREATE POLICY "Allow public read on emerging_signals" ON emerging_signals FOR SELECT USING (true);

-- Allow full modifications from server role / authenticated sessions
CREATE POLICY "Allow public insert on investigations" ON investigations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on investigations" ON investigations FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on investigation_notes" ON investigation_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on audit_log" ON audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on investigation_reports" ON investigation_reports FOR INSERT WITH CHECK (true);
