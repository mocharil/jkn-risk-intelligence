import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";

/**
 * Uji ujung ke ujung fitur unggah berkas: parse (CSV/TSV/XLSX/JSON) -> anonimisasi -> usulan pemetaan
 * -> konfirmasi -> normalisasi -> analisis. Memakai direktori data sementara dan tanpa LLM.
 */
const g = globalThis as unknown as Record<string, unknown>;
const actor = { name: "Uji", role: "SUPERVISOR" } as never;
let dir = "";

const HEAD = "no_sep,nama_pasien,nik,kode_rs,dx_utama,tgl_masuk,tgl_keluar,tarif_rs,alamat";
const row = (i: number, over: Partial<Record<string, string>> = {}) => {
  const f = { sep: `SEP-T-${String(i).padStart(4, "0")}`, nama: `Pasien ${i}`, nik: `32011234567890${String(i % 90).padStart(2, "0")}`, rs: "FKL-010", dx: "A09", in: "2026-09-03", out: "2026-09-06", amt: String(2_000_000 + i * 1000), addr: `Jl. Uji ${i}`, ...over };
  return [f.sep, f.nama, f.nik, f.rs, f.dx, f.in, f.out, f.amt, f.addr].join(",");
};
const csv = (n: number, extra: string[] = []) => Buffer.from([HEAD, ...Array.from({ length: n }, (_, i) => row(i + 1)), ...extra].join("\n"));

async function api() {
  const service = await import("@/lib/ingest/service");
  const store = (await import("@/lib/data/store")).getStore();
  return { service, store };
}

async function ingest(buf: Buffer, name: string) {
  const { service, store } = await api();
  const created = await service.createDatasetFromUpload(buf, name, actor);
  const mappings = created.dataset.mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) }));
  const done = await service.confirmMappingAndIngest(created.dataset.dataset_id, mappings, actor);
  return { created, done, store };
}

describe("unggah berkas ujung ke ujung", () => {
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "arsa-upload-"));
    process.env.ARSA_DATA_DIR = dir;
    process.env.LLM_PROVIDER = "off";
    delete g.__arsaStore;
  });
  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 400));
    delete g.__arsaStore;
    delete process.env.ARSA_DATA_DIR;
    delete process.env.LLM_PROVIDER;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("CSV: klaim valid masuk, baris buruk ditolak dengan alasan, PII tidak tersimpan", async () => {
    const buf = csv(30, [row(5), ",Tanpa ID,3201123456789013,FKL-011,A09,2026-09-02,2026-09-05,1500000,Jl. Y", row(901, { amt: "abc" })]);
    const { done, store } = await ingest(buf, "uji.csv");
    expect(done.status).toBe("READY");
    expect(done.result?.claims_ingested).toBe(30);
    expect(done.rejected_rows?.length).toBe(3);
    expect(done.rejected_rows?.map((r) => r.reason).join("|")).toMatch(/duplikat/);
    expect(store.ingestedClaimIds.size).toBe(30);
    const blob = fs.readFileSync(path.join(dir, "uploads", `${done.dataset_id}.json`), "utf8");
    expect(blob).not.toMatch(/32011234567890\d\d/);
    expect(blob).not.toContain("Pasien 1");
    expect(blob).not.toContain("Jl. Uji");
  }, 60_000);

  it("XLSX dan JSON menghasilkan hasil yang sama dengan CSV", async () => {
    const aoa = [HEAD.split(","), ...Array.from({ length: 12 }, (_, i) => row(i + 1).split(","))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Klaim");
    const xlsx = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const a = await ingest(xlsx, "uji.xlsx");
    expect(a.done.status).toBe("READY");
    expect(a.done.result?.claims_ingested).toBe(12);

    delete g.__arsaStore;
    const objs = Array.from({ length: 12 }, (_, i) => Object.fromEntries(HEAD.split(",").map((h, k) => [h, row(i + 1).split(",")[k]])));
    const j1 = await ingest(Buffer.from(JSON.stringify(objs)), "uji.json");
    expect(j1.done.result?.claims_ingested).toBe(12);

    delete g.__arsaStore;
    const j2 = await ingest(Buffer.from(JSON.stringify({ data: objs })), "uji2.json");
    expect(j2.done.result?.claims_ingested).toBe(12);
  }, 90_000);

  it("CSV titik-koma, TSV, dan BOM terbaca", async () => {
    const semi = Buffer.from("﻿" + csv(8).toString().replace(/,/g, ";"));
    expect((await ingest(semi, "semi.csv")).done.result?.claims_ingested).toBe(8);
    delete g.__arsaStore;
    const tsv = Buffer.from(csv(8).toString().replace(/,/g, "\t"));
    expect((await ingest(tsv, "uji.tsv")).done.result?.claims_ingested).toBe(8);
  }, 90_000);

  it("format tanggal dan angka Indonesia (dd/mm/yyyy, 'Rp 1.500.000') terbaca", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => row(i + 1, { in: "03/09/2026", out: "06/09/2026", amt: `"Rp ${(2 + i).toString()}.500.000"` }));
    const { done } = await ingest(Buffer.from([HEAD, ...rows].join("\n")), "id.csv");
    expect(done.result?.claims_ingested).toBe(6);
  }, 60_000);

  it("berkas bermasalah ditolak dengan pesan jelas (tanpa membuat dataset)", async () => {
    const { service, store } = await api();
    await expect(service.createDatasetFromUpload(Buffer.from(""), "kosong.csv", actor)).rejects.toThrow();
    await expect(service.createDatasetFromUpload(Buffer.from(HEAD), "headeronly.csv", actor)).rejects.toThrow(/baris data/i);
    await expect(service.createDatasetFromUpload(Buffer.from("{bukan json"), "rusak.json", actor)).rejects.toThrow();
    await expect(service.createDatasetFromUpload(Buffer.from(JSON.stringify({ a: 1 })), "obj.json", actor)).rejects.toThrow(/array/i);
    await expect(service.createDatasetFromUpload(Buffer.alloc(21 * 1024 * 1024, 1), "besar.csv", actor)).rejects.toThrow(/20 MB/);
    expect(store.datasets.filter((d) => d.dataset_id !== "DS-SEED")).toHaveLength(0);
  });

  it("semua baris duplikat atau tidak valid -> ERROR, bukan READY, dan klaim tidak bertambah", async () => {
    const first = await ingest(csv(5), "a.csv");
    expect(first.done.status).toBe("READY");
    const second = await ingest(csv(5), "b.csv");
    expect(second.done.status).toBe("ERROR");
    expect(second.done.error_message).toMatch(/sudah ada/i);
    expect(second.store.ingestedClaimIds.size).toBe(5);
  }, 90_000);

  it("tanpa kolom tagihan: field wajib kurang terdeteksi saat konfirmasi tidak menambah klaim", async () => {
    const noAmount = Buffer.from(["no_sep,kode_rs,dx_utama,tgl_masuk,tgl_keluar", "SEP-X-1,FKL-010,A09,2026-09-03,2026-09-06", "SEP-X-2,FKL-010,A09,2026-09-03,2026-09-06"].join("\n"));
    const { done, store } = await ingest(noAmount, "noamt.csv");
    expect(done.status).toBe("ERROR");
    expect(store.ingestedClaimIds.size).toBe(0);
  }, 60_000);

  it("konfirmasi ganda: yang kedua ditolak, tidak memasukkan klaim dua kali", async () => {
    const { service, store } = await api();
    const created = await service.createDatasetFromUpload(csv(10), "dbl.csv", actor);
    const mappings = created.dataset.mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) }));
    const results = await Promise.allSettled([
      service.confirmMappingAndIngest(created.dataset.dataset_id, mappings, actor),
      service.confirmMappingAndIngest(created.dataset.dataset_id, mappings, actor),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(store.ingestedClaimIds.size).toBe(10);
    expect(store.claims.filter((c) => c.claim_id.startsWith("SEP-T-")).length).toBe(10);
  }, 90_000);

  it("kegagalan analisis memulihkan keadaan: klaim di-rollback, status ERROR, bukan NORMALIZING", async () => {
    const engine = await import("@/lib/risk/engine");
    const spy = (await import("vitest")).vi.spyOn(engine, "analyzeAll").mockRejectedValueOnce(new Error("simulasi gagal"));
    const { service, store } = await api();
    const created = await service.createDatasetFromUpload(csv(6), "gagal.csv", actor);
    const mappings = created.dataset.mappings.map((m) => ({ ...m, status: m.canonical_field ? ("CONFIRMED" as const) : ("UNMAPPED" as const) }));
    await expect(service.confirmMappingAndIngest(created.dataset.dataset_id, mappings, actor)).rejects.toThrow(/simulasi gagal/);
    spy.mockRestore();
    const ds = store.datasets.find((d) => d.dataset_id === created.dataset.dataset_id)!;
    expect(ds.status).toBe("ERROR");
    expect(store.ingestedClaimIds.size).toBe(0);
  }, 60_000);

  it("dataset yang terputus saat server dimuat ulang tidak tertahan di NORMALIZING", async () => {
    const { service, store } = await api();
    const created = await service.createDatasetFromUpload(csv(4), "putus.csv", actor);
    const ds = store.datasets.find((d) => d.dataset_id === created.dataset.dataset_id)!;
    ds.status = "NORMALIZING";
    (await import("@/lib/data/store")).persist();
    await new Promise((r) => setTimeout(r, 600));
    delete g.__arsaStore;
    const reborn = (await import("@/lib/data/store")).getStore();
    expect(reborn.datasets.find((d) => d.dataset_id === ds.dataset_id)?.status).toBe("ERROR");
  }, 60_000);

  it("membuang dataset: hanya yang belum selesai, baris anonim ikut terhapus", async () => {
    const { service, store } = await api();
    const pending = await service.createDatasetFromUpload(csv(4), "tunda.csv", actor);
    const file = path.join(dir, "uploads", `${pending.dataset.dataset_id}.json`);
    expect(fs.existsSync(file)).toBe(true);
    service.discardDataset(pending.dataset.dataset_id, actor);
    expect(store.datasets.some((d) => d.dataset_id === pending.dataset.dataset_id)).toBe(false);
    expect(fs.existsSync(file)).toBe(false);

    const ready = await ingest(csv(4), "selesai.csv");
    expect(() => service.discardDataset(ready.done.dataset_id, actor)).toThrow(/sudah dianalisis/);
    expect(() => service.discardDataset("DS-SEED", actor)).toThrow(/bawaan/);
    expect(() => service.discardDataset("DS-999", actor)).toThrow(/tidak ditemukan/);
  }, 60_000);

  it("berkas besar (5.000 baris) selesai dalam batas wajar", async () => {
    const t0 = Date.now();
    const { done } = await ingest(csv(5000), "besar.csv");
    expect(done.result?.claims_ingested).toBe(5000);
    expect(Date.now() - t0).toBeLessThan(90_000);
  }, 180_000);
});
