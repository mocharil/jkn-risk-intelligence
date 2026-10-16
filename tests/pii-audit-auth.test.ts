import { describe, expect, it } from "vitest";
import { anonymizePatient, containsRawPII, initialsOnly, maskCardNumber, pseudonymPatientId, scrubText } from "@/lib/pii/anonymize";
import { anonymizeUpload } from "@/lib/ingest/pii";
import { appendEntry, AuditEntry, verifyChain } from "@/lib/audit/chain";
import { SESSION_COOKIE, signSession, verifySession } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/types";
import { hashPassword, verifyPassword } from "@/lib/auth/users";
import { getStore } from "@/lib/data/store";
import { EMBEDDING_DIM, normalizeVectorDim } from "@/lib/ai/embeddings";

describe("anonimisasi (UU PDP)", () => {
  it("pseudonim stabil, tidak mengandung nilai asli", () => {
    const a = pseudonymPatientId("0001892837461");
    expect(a).toBe(pseudonymPatientId("0001892837461"));
    expect(a).not.toContain("0001892837461");
    expect(pseudonymPatientId("0001892837462")).not.toBe(a);
  });

  it("nama -> inisial, kartu -> hanya 4 digit akhir", () => {
    expect(initialsOnly("Bambang Sudibyo")).toBe("B. S.");
    expect(initialsOnly("dr. Hendra Prasetyo")).toBe("H. P.");
    expect(maskCardNumber("0001892837461")).toBe("•".repeat(9) + "7461");
  });

  it("NIK tidak pernah disimpan pada pasien teranonimkan", () => {
    const { patient, report } = anonymizePatient({ id: "X", name: "Siti Aminah", card_number: "0001892837461", nik: "3174051208750003", address: "Jl. Mawar 1", age: 40, gender: "P" });
    expect(JSON.stringify(patient)).not.toContain("3174051208750003");
    expect(JSON.stringify(patient)).not.toContain("Siti");
    expect(report.fields_dropped).toEqual(expect.arrayContaining(["nik", "address"]));
  });

  it("scrubText: NIK 16 digit tidak terpotong pola telepon (regresi bug urutan regex)", () => {
    const out = scrubText("Pasien Dewi Wijaya (NIK 3169083009954567, HP 081274483407) datang", ["Dewi Wijaya"]);
    expect(out).toContain("[NIK]");
    expect(out).toContain("[TELEPON]");
    expect(out).toContain("[PASIEN]");
    expect(out).not.toMatch(/\d{10}/);
    expect(containsRawPII(out)).toBe(false);
  });

  it("scrubText: mengaburkan telepon rumah, alamat jalan/RT-RW inline, serta penyebutan nama parsial pasien", () => {
    const raw = "Pasien Tn. Bambang mengeluh sesak. Domisili Jl. Sudirman No. 45, RT 02/RW 05, telp (021) 7654321.";
    const out = scrubText(raw, ["Bambang Sudibyo"]);
    expect(out).not.toContain("Bambang");
    expect(out).not.toContain("Sudirman");
    expect(out).not.toContain("RT 02");
    expect(out).not.toContain("7654321");
    expect(out).toContain("[PASIEN]");
    expect(out).toContain("[ALAMAT]");
    expect(out).toContain("[TELEPON]");
    expect(containsRawPII(out)).toBe(false);
  });

  it("anonymizeUpload: PII dikaburkan sebelum disimpan / dikirim ke LLM", () => {
    const cols = ["NO_KARTU", "NIK", "NAMA_PASIEN", "ALAMAT", "NO_HP", "RESUME", "DIAG"];
    const rows = [
      { NO_KARTU: "0001892837461", NIK: "3174051208750003", NAMA_PASIEN: "Bambang Sudibyo", ALAMAT: "Jl. Mawar 1", NO_HP: "081234567890", RESUME: "Pasien Bambang Sudibyo (NIK 3174051208750003) mengeluh diare cair sejak dua hari dengan demam ringan dan mual muntah berulang disertai lemas", DIAG: "A09" },
    ];
    const out = anonymizeUpload(cols, rows);
    const blob = JSON.stringify(out.rows);
    expect(blob).not.toContain("0001892837461");
    expect(blob).not.toContain("3174051208750003");
    expect(blob).not.toContain("Bambang");
    expect(blob).not.toContain("Jl. Mawar");
    expect(blob).not.toContain("081234567890");
    expect(out.columns).not.toContain("ALAMAT");
    expect(out.columns).not.toContain("NO_HP");
    expect(out.report.columns_dropped).toEqual(expect.arrayContaining(["ALAMAT", "NO_HP"]));
    expect(out.rows[0].DIAG).toBe("A09"); // data non-PII tetap
  });
});

describe("audit trail hash chain", () => {
  const make = (): AuditEntry[] => {
    const c: AuditEntry[] = [];
    for (let i = 0; i < 5; i++) appendEntry(c, { claim_id: "CLM-1", actor: "A", actor_role: "INVESTIGATOR", action: `ACT_${i}`, previous_status: "NEW", new_status: "UNDER_INVESTIGATION", justification: "uji" });
    return c;
  };

  it("rantai utuh valid", () => {
    expect(verifyChain(make()).valid).toBe(true);
  });

  it("mengubah isi satu entri membuat verifikasi gagal", () => {
    const c = make();
    c[2].justification = "dimanipulasi";
    const v = verifyChain(c);
    expect(v.valid).toBe(false);
    expect(v.broken_at_seq).toBe(3);
  });

  it("menghapus entri tengah terdeteksi", () => {
    const c = make();
    c.splice(2, 1);
    expect(verifyChain(c).valid).toBe(false);
  });

  it("hash terikat ke entri sebelumnya (tidak acak, bukan konstanta)", () => {
    const c = make();
    expect(new Set(c.map((e) => e.hash)).size).toBe(5);
    expect(c[1].previous_hash).toBe(c[0].hash);
    expect(c[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sesi & RBAC", () => {
  it("token valid diverifikasi, token dimodifikasi ditolak", async () => {
    const t = await signSession({ uid: "U1", email: "a@b.id", name: "A", role: "INVESTIGATOR" });
    expect((await verifySession(t))?.role).toBe("INVESTIGATOR");
    const [body, sig] = t.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "U1", email: "a@b.id", name: "A", role: "ADMIN", exp: 9999999999 })).toString("base64url")}.${sig}`;
    expect(await verifySession(forged)).toBeNull();
    expect(await verifySession(`${body}.x${sig}`)).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });

  it("token kedaluwarsa ditolak", async () => {
    const t = await signSession({ uid: "U1", email: "a@b.id", name: "A", role: "ADMIN" }, -10);
    expect(await verifySession(t)).toBeNull();
  });

  it("pencabutan sesi & perubahan peran pengguna di store langsung berlaku tanpa menunggu cookie habis", async () => {
    const store = getStore();
    const inv = store.users.find((u) => u.user_id === "USR-001")!;
    const token = await signSession({ uid: inv.user_id, email: inv.email, name: inv.name, role: "INVESTIGATOR" });
    const req = () => new Request("http://localhost/api/claims", { headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } });

    expect((await getSessionUser(req()))?.role).toBe("INVESTIGATOR");
    inv.role = "SUPERVISOR";
    expect((await getSessionUser(req()))?.role).toBe("SUPERVISOR");
    inv.active = false;
    expect(await getSessionUser(req())).toBeNull();

    // Kembalikan state awal
    inv.role = "INVESTIGATOR";
    inv.active = true;
  });

  it("matriks izin per peran", () => {
    expect(can("INVESTIGATOR", "case.final_decision")).toBe(false);
    expect(can("SUPERVISOR", "case.final_decision")).toBe(true);
    expect(can("SUPERVISOR", "admin.reset_demo")).toBe(false);
    expect(can("ADMIN", "admin.users")).toBe(true);
    expect(can(undefined, "case.annotate")).toBe(false);
  });

  it("password di-hash (scrypt) dan diverifikasi", () => {
    const h = hashPassword("Rahasia#1");
    expect(h).not.toContain("Rahasia#1");
    expect(verifyPassword("Rahasia#1", h)).toBe(true);
    expect(verifyPassword("salah", h)).toBe(false);
  });

  it("normalizeVectorDim mengadaptasi dimensi vektor non-768 menjadi tepat 768 ter-normalisasi L2", () => {
    const v1536 = Array.from({ length: 1536 }, (_, i) => Math.sin(i + 1));
    const norm = normalizeVectorDim(v1536);
    expect(norm).toHaveLength(EMBEDDING_DIM);
    const l2 = Math.sqrt(norm.reduce((s, x) => s + x * x, 0));
    expect(l2).toBeCloseTo(1, 3);
  });
});
