-- =============================================================================
-- Arsa AI: pencarian kemiripan pgvector + audit trail append-only di level database.
-- Berjalan di Supabase maupun Postgres biasa dengan ekstensi pgvector (mis. image pgvector/pgvector:pg16).
-- Idempoten: aman dijalankan berulang.
-- =============================================================================
create extension if not exists vector;
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Vektor narasi klaim (768 dimensi, cosine)
--    Tabel mandiri (tanpa FK) agar tidak bergantung pada skema klaim lama.
-- -----------------------------------------------------------------------------
create table if not exists arsa_claim_vectors (
    claim_id      text primary key,
    provider_id   text,
    primary_dx    text,
    model         text not null,                 -- label model embedding; vektor beda model TIDAK pernah dibandingkan
    embedding     vector(768) not null,
    updated_at    timestamptz not null default now()
);
create index if not exists arsa_claim_vectors_hnsw on arsa_claim_vectors using hnsw (embedding vector_cosine_ops);
create index if not exists arsa_claim_vectors_model on arsa_claim_vectors (model);

-- Tetangga terdekat untuk SELURUH klaim sekaligus (satu panggilan, set-based).
-- Mengecualikan diri sendiri; hanya membandingkan vektor dengan model yang sama.
create or replace function arsa_match_all(p_model text, p_threshold double precision, p_limit int)
returns table (claim_id text, other_id text, similarity double precision)
language sql stable as $$
    select a.claim_id, n.claim_id, n.sim
    from arsa_claim_vectors a
    cross join lateral (
        select b.claim_id, 1 - (a.embedding <=> b.embedding) as sim
        from arsa_claim_vectors b
        where b.model = a.model and b.claim_id <> a.claim_id
        order by a.embedding <=> b.embedding
        limit p_limit
    ) n
    where a.model = p_model and n.sim >= p_threshold;
$$;

-- -----------------------------------------------------------------------------
-- 2. Audit trail append-only dengan hash chain SHA-256
--    Kanonik hash identik dengan aplikasi: sha256(previous_hash || JSON.stringify([seq,log_id,timestamp,...]))
-- -----------------------------------------------------------------------------
create table if not exists arsa_audit_log (
    seq             bigint primary key,
    log_id          text not null,
    ts              text not null,               -- ISO string persis seperti di aplikasi (agar hash dapat diverifikasi ulang)
    claim_id        text not null,
    actor           text not null,
    actor_role      text not null,
    action          text not null,
    previous_status text,
    new_status      text,
    justification   text not null,
    previous_hash   text not null,
    hash            text not null,
    inserted_at     timestamptz not null default now()
);

-- Canonical string yang dipakai hash (cocok dengan JSON.stringify di aplikasi).
create or replace function arsa_audit_canonical(r arsa_audit_log) returns text language sql immutable as $$
    select '[' || r.seq || ',' || to_json(r.log_id)::text || ',' || to_json(r.ts)::text || ',' || to_json(r.claim_id)::text || ',' ||
           to_json(r.actor)::text || ',' || to_json(r.actor_role)::text || ',' || to_json(r.action)::text || ',' ||
           coalesce(to_json(r.previous_status)::text, 'null') || ',' || coalesce(to_json(r.new_status)::text, 'null') || ',' ||
           to_json(r.justification)::text || ']';
$$;

-- Tolak UPDATE / DELETE / TRUNCATE apa pun.
create or replace function arsa_audit_immutable() returns trigger language plpgsql as $$
begin
    raise exception 'arsa_audit_log bersifat append-only (% ditolak)', tg_op using errcode = 'insufficient_privilege';
end $$;

drop trigger if exists arsa_audit_no_update on arsa_audit_log;
create trigger arsa_audit_no_update before update or delete on arsa_audit_log for each row execute function arsa_audit_immutable();
drop trigger if exists arsa_audit_no_truncate on arsa_audit_log;
create trigger arsa_audit_no_truncate before truncate on arsa_audit_log for each statement execute function arsa_audit_immutable();

-- INSERT hanya valid bila menyambung rantai: seq berurutan, previous_hash = hash terakhir, dan hash benar.
create or replace function arsa_audit_chain_guard() returns trigger language plpgsql as $$
declare
    last_seq bigint;
    last_hash text;
begin
    perform pg_advisory_xact_lock(7319002); -- serialisasi penulis agar rantai tidak bercabang
    select seq, hash into last_seq, last_hash from arsa_audit_log order by seq desc limit 1;
    if last_seq is null then
        last_seq := 0;
        last_hash := repeat('0', 64);
    end if;
    if new.seq <> last_seq + 1 then
        raise exception 'seq audit harus % (diterima %)', last_seq + 1, new.seq using errcode = 'check_violation';
    end if;
    if new.previous_hash <> last_hash then
        raise exception 'previous_hash tidak menyambung dengan entri terakhir' using errcode = 'check_violation';
    end if;
    if new.hash <> encode(digest(new.previous_hash || arsa_audit_canonical(new), 'sha256'), 'hex') then
        raise exception 'hash tidak sesuai isi entri' using errcode = 'check_violation';
    end if;
    return new;
end $$;

drop trigger if exists arsa_audit_chain on arsa_audit_log;
create trigger arsa_audit_chain before insert on arsa_audit_log for each row execute function arsa_audit_chain_guard();

-- Verifikasi seluruh rantai langsung di database.
create or replace function arsa_audit_verify() returns table (valid boolean, length bigint, broken_at_seq bigint, reason text)
language plpgsql stable as $$
declare
    r arsa_audit_log;
    prev text := repeat('0', 64);
    n bigint := 0;
begin
    for r in select * from arsa_audit_log order by seq loop
        n := n + 1;
        if r.seq <> n then return query select false, n, r.seq, 'seq tidak berurutan'; return; end if;
        if r.previous_hash <> prev then return query select false, n, r.seq, 'previous_hash tidak cocok'; return; end if;
        if r.hash <> encode(digest(r.previous_hash || arsa_audit_canonical(r), 'sha256'), 'hex') then
            return query select false, n, r.seq, 'isi entri berubah'; return;
        end if;
        prev := r.hash;
    end loop;
    return query select true, n, null::bigint, null::text;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Keamanan: tabel ini hanya boleh diakses lewat koneksi server (service role / owner).
--    RLS aktif tanpa policy = akses anon/authenticated via PostgREST ditolak.
-- -----------------------------------------------------------------------------
alter table arsa_claim_vectors enable row level security;
alter table arsa_audit_log enable row level security;
