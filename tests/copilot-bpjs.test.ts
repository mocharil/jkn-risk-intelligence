import { afterEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/data/store";
import { buildContext } from "@/lib/ai/context";
import { askCopilot, validateCitations } from "@/lib/ai/copilot";
import { defaultPolicy, setGovernancePolicy } from "@/lib/governance/policy";
import { computeProvinceRisk } from "@/lib/analytics/aggregates";

const ids = (q: string, extra: { claim_id?: string } = {}) => buildContext(getStore(), { question: q, ...extra }).map((i) => i.id);

describe("Copilot: konteks statistik BPJS", () => {
  it("selalu membawa ringkasan nasional BPJS sebagai pembanding", () => {
    expect(ids("Faskes mana yang paling berisiko?")).toContain("bpjs:national");
    const item = buildContext(getStore(), { question: "halo" }).find((i) => i.id === "bpjs:national")!;
    expect(item.text).toMatch(/Portal Data BPJS Kesehatan/);
    expect(item.text).toMatch(/4\.747\.547/); // rerata biaya per admisi 2018
    expect(item.text).toMatch(/konteks kewajaran, bukan bukti kecurangan/);
  });

  it("klaim yang dibahas membawa posisi terhadap rerata nasional (butir terkutip)", () => {
    const list = buildContext(getStore(), { question: "Apakah biaya klaim CLM-10293 wajar?" });
    const b = list.find((i) => i.id === "bpjs:claim:CLM-10293")!;
    expect(b).toBeTruthy();
    expect(b.text).toMatch(/x rerata nasional kelas 2/);
    expect(b.text).toMatch(/peringkat 2 nasional/); // A09 = peringkat 2 di statistik BPJS 2018
  });

  it("provinsi disebut nama biasa/singkat: Jakarta, dan nama panjang tidak ikut menangkap yang pendek", () => {
    expect(ids("Bandingkan Jakarta dengan Jawa Timur")).toEqual(expect.arrayContaining(["bpjs:province:ID-JK", "bpjs:province:ID-JI"]));
    const pb = ids("biaya di Papua Barat");
    expect(pb).toContain("bpjs:province:ID-PB");
    expect(pb).not.toContain("bpjs:province:ID-PA");
    const kr = ids("kondisi Kepulauan Riau");
    expect(kr).toContain("bpjs:province:ID-KR");
    expect(kr).not.toContain("bpjs:province:ID-RI");
  });

  it("diagnosis dan daftar penyakit terbanyak: butir BPJS tersedia", () => {
    expect(ids("Apa diagnosis rawat inap terbanyak?")).toContain("bpjs:top_diagnoses");
    const d = buildContext(getStore(), { question: "bagaimana K30 dan M54.5?" });
    expect(d.find((i) => i.id === "bpjs:dx:K30")!.text).toMatch(/peringkat 3/);
    expect(d.find((i) => i.id === "bpjs:dx:M54.5")!.text).toMatch(/tidak termasuk/);
  });

  it("butir BPJS tidak terpotong batas 40 butir walau banyak klaim disebut", () => {
    const store = getStore();
    const q = store.claims.slice(0, 3).map((c) => c.claim_id).join(" dan ");
    const list = buildContext(store, { question: `bandingkan ${q} dengan Jawa Barat` });
    expect(list.length).toBeLessThanOrEqual(40);
    expect(list.some((i) => i.id.startsWith("bpjs:claim:"))).toBe(true);
    expect(list.some((i) => i.id === "bpjs:province:ID-JB")).toBe(true);
  });

  it("ID klaim di luar format CLM (mis. nomor klaim BPJS hasil impor) ditemukan", () => {
    const store = getStore();
    const target = store.claims[40];
    const fakeId = "K201899999999";
    const cloned = { ...target, claim_id: fakeId };
    store.claims.push(cloned);
    try {
      expect(ids(`jelaskan klaim ${fakeId}`)).toContain(`claim:${fakeId}`);
    } finally {
      store.claims.pop();
    }
  });

  it("tautan entitas: klaim tanpa kasus diarahkan ke daftar klaim, provinsi ke peta, tanpa skor karangan", () => {
    const store = getStore();
    const noCase = store.claims.find((c) => !c.investigation_id)!;
    const l = buildContext(store, { question: `klaim ${noCase.claim_id} di Jawa Barat` }).filter((i) => i.link);
    const claimLink = l.find((i) => i.link!.type === "CLAIM" && i.link!.id === noCase.claim_id)!.link!;
    expect(claimLink.href).toBe(`/investigation-queue?mode=CLAIMS&search=${encodeURIComponent(noCase.claim_id)}`);
    const mapLink = l.find((i) => i.link!.type === "MAP")!.link!;
    expect(mapLink.href).toBe("/risk-intelligence?tab=peta&province=ID-JB");
    const jb = computeProvinceRisk(store).find((r) => r.province_code === "ID-JB")!;
    expect(mapLink.risk_score).toBe(jb.risk_score); // skor nyata provinsi, bukan angka tetap per tingkat risiko
  });

  it("validator sitasi menerima id bpjs:* yang ada dan membuang yang dikarang", () => {
    const items = buildContext(getStore(), { question: "biaya klaim CLM-10293" });
    const v = validateCitations("Biaya 3,9x [bpjs:claim:CLM-10293]. Palsu [bpjs:claim:CLM-99999].", items);
    expect(v.used).toEqual(["bpjs:claim:CLM-10293"]);
    expect(v.removed).toBe(1);
  });
});

describe("Copilot: kebijakan tata kelola ditegakkan", () => {
  afterEach(() => setGovernancePolicy(defaultPolicy()));

  it("mode DETERMINISTIC_ONLY memaksa jawaban tanpa LLM, tetap bersitasi", async () => {
    setGovernancePolicy({ ...defaultPolicy(), copilot_mode: "DETERMINISTIC_ONLY" });
    const r = await askCopilot(getStore(), { question: "Mengapa klaim CLM-10293 dianggap berisiko?" });
    expect(r.mode).toBe("deterministic");
    expect(r.fallback_reason).toMatch(/Kebijakan tata kelola/);
    expect(r.grounding.valid_citations).toBeGreaterThan(0);
    expect(r.evidence_citations.some((c) => c.evidence_id.startsWith("bpjs:claim:"))).toBe(true);
  });
});
