import { afterEach, describe, expect, it } from "vitest";
import { getStore } from "@/lib/data/store";
import { buildContext } from "@/lib/ai/context";
import { askCopilot, guardTypeHeadings } from "@/lib/ai/copilot";
import { buildVisuals } from "@/lib/ai/copilot-visuals";
import { focusClaimFor } from "@/lib/ai/chat-focus";
import { defaultPolicy, setGovernancePolicy } from "@/lib/governance/policy";
import { computePatternShifts } from "@/lib/analytics/aggregates";
import { ALL_RISK_TYPES } from "@/types/risk";
import { RISK_LEVEL_LABEL, RISK_TYPE_LABEL, claimStatusName, riskTypeName } from "@/lib/risk/labels";

const RAW_CODE = /\b(?:UPCODING|CLONING|PHANTOM_BILLING|ABNORMAL_LOS|UNBUNDLING|INFLATED_BILLS|REPEAT_BILLING|READMISSION|CRITICAL|MEDIUM|UNDER_INVESTIGATION|NEED_EVIDENCE|CONFIRMED_RISK|FALSE_POSITIVE|PENDING_REVIEW|IN_QUEUE)\b/;
/** Id aturan (mis. "R-UPCODING-01") memang berupa kode; yang diperiksa adalah teks yang dibaca pengguna. */
const readable = (text: string) => text.replace(/aturan [A-Z0-9_.-]+/g, "aturan -");

const topClaim = () => [...getStore().claims].sort((a, b) => b.risk_score - a.risk_score)[0];

describe("Copilot: nama dan istilah sama dengan antarmuka lain", () => {
  it("setiap jenis risiko punya satu nama, unik, dan bukan kode mentah", () => {
    const names = ALL_RISK_TYPES.map((t) => RISK_TYPE_LABEL[t]);
    expect(new Set(names).size).toBe(ALL_RISK_TYPES.length);
    names.forEach((n, i) => expect(n).not.toBe(ALL_RISK_TYPES[i]));
    expect(Object.values(RISK_LEVEL_LABEL)).toEqual(["Kritis", "Tinggi", "Sedang", "Rendah"]);
  });

  it("kode yang tidak dikenal dirapikan, tidak dibiarkan mentah", () => {
    expect(riskTypeName("NEW_DETECTOR")).toBe("new detector");
    expect(claimStatusName("SOME_STATUS")).toBe("some status");
  });

  it("konteks klaim, faskes, provinsi, dan jenis risiko tidak memuat kode mentah", () => {
    const c = topClaim();
    const questions = [
      `Mengapa klaim ${c.claim_id} dianggap berisiko?`,
      "Faskes mana yang paling berisiko dan apa polanya?",
      "Bandingkan risiko Jakarta dan Jawa Timur",
      "Berapa klaim dengan sinyal upcoding dan cloning?",
      "Apa pola anomali yang sedang naik minggu ini?",
    ];
    for (const q of questions) {
      for (const item of buildContext(getStore(), { question: q })) {
        expect(readable(`${item.title} ${item.text}`), `${item.id} untuk "${q}"`).not.toMatch(RAW_CODE);
      }
    }
  });
});

describe("Copilot: judul poin tidak menambah temuan yang tidak ada", () => {
  it("nama jenis risiko dipertahankan bila poin mengutip temuan jenis itu", () => {
    const t = "- **Upcoding**: Severity 3 padahal benchmark level 1 [finding:CLM-1:UPCODING].";
    expect(guardTypeHeadings(t)).toBe(t);
  });

  it("selisih tagihan yang diberi judul Inflasi Tagihan tanpa temuan jenis itu diganti judul netral", () => {
    const t = "- **Inflasi Tagihan**: Tagihan 184% di atas median peer [claim:CLM-1].";
    expect(guardTypeHeadings(t)).toBe("- **Selisih Tagihan**: Tagihan 184% di atas median peer [claim:CLM-1].");
  });

  it("jenis lain tanpa temuan menjadi Catatan, dan hanya bagian yang tidak didukung yang diganti", () => {
    expect(guardTypeHeadings("- **Phantom Billing**: x [claim:CLM-1].")).toBe("- **Catatan**: x [claim:CLM-1].");
    const mixed = "- **Upcoding & Unbundling**: x [finding:CLM-1:UPCODING].";
    expect(guardTypeHeadings(mixed)).toBe("- **Upcoding & Catatan**: x [finding:CLM-1:UPCODING].");
  });

  it("teks biasa, judul netral, dan nama jenis risiko di dalam kalimat tidak disentuh", () => {
    const t = "Ringkasan.\n- **Profil Faskes**: dominan Upcoding [provider:FKL-1].\nUpcoding terjadi di banyak klaim.";
    expect(guardTypeHeadings(t)).toBe(t);
  });
});

describe("Copilot: faskes paling berisiko disebut menurut dua kriteria", () => {
  it("daftar faskes memuat urutan skor dan urutan eksposur, dan tautannya mengikuti keduanya", () => {
    const items = buildContext(getStore(), { question: "Faskes mana yang paling berisiko?" });
    const list = items.find((i) => i.id === "list:top_providers")!;
    expect(list.text).toMatch(/Urut skor risiko:/);
    expect(list.text).toMatch(/Urut eksposur rupiah terbesar:/);

    const providers = getStore().providers;
    const byScore = [...providers].sort((a, b) => b.risk_score - a.risk_score)[0];
    const byExposure = [...providers].sort((a, b) => b.potential_exposure - a.potential_exposure)[0];
    expect(list.link!.id).toBe(byScore.provider_id);
    const extra = items.find((i) => i.id === "list:top_exposure_provider");
    if (byExposure.provider_id !== byScore.provider_id) expect(extra!.link!.id).toBe(byExposure.provider_id);
    else expect(extra).toBeUndefined();
  });
});

describe("Copilot: visual faskes mengikuti jawaban", () => {
  it("pertanyaan umum menampilkan lima faskes teratas, termasuk yang skornya tertinggi dan yang eksposurnya terbesar", () => {
    const store = getStore();
    const items = buildContext(store, { question: "Faskes mana yang paling berisiko dan apa polanya?" });
    const v = buildVisuals(store, items, "").find((x) => x.kind === "providers");
    expect(v && v.kind === "providers" ? v.rows.length : 0).toBeGreaterThan(1);
    const ids = v && v.kind === "providers" ? v.rows.map((r) => r.provider_id) : [];
    const byScore = [...store.providers].sort((a, b) => b.risk_score - a.risk_score)[0];
    const byExposure = [...store.providers].sort((a, b) => b.potential_exposure - a.potential_exposure)[0];
    expect(ids).toContain(byScore.provider_id);
    expect(ids).toContain(byExposure.provider_id);
  });

  it("faskes yang disebut namanya tetap menjadi satu-satunya visual", () => {
    const store = getStore();
    const p = store.providers[0];
    const items = buildContext(store, { question: `Bagaimana profil risiko ${p.name}?` });
    const v = buildVisuals(store, items, "").find((x) => x.kind === "providers");
    expect(v && v.kind === "providers" ? v.rows.map((r) => r.provider_id) : []).toEqual([p.provider_id]);
  });
});

describe("Copilot: pola yang naik memakai angka yang sama dengan dashboard", () => {
  it("pertanyaan tentang pola membawa pergeseran pola 14 hari, termasuk bila tidak ada yang bermakna", () => {
    const item = buildContext(getStore(), { question: "Apa pola anomali yang sedang naik minggu ini?" }).find((i) => i.id === "agg:pattern_shifts")!;
    expect(item).toBeTruthy();
    const shifts = computePatternShifts(getStore());
    const first = shifts[0];
    expect(item.text).toContain(`${RISK_TYPE_LABEL[first.risk_type]} ${first.recent} vs ${first.previous}`);
    if (!shifts.some((s) => s.significant)) expect(item.text).toMatch(/Tidak ada jenis temuan yang naik secara bermakna/);
  });

  it("pertanyaan lain tidak membawa butir pola", () => {
    const ids = buildContext(getStore(), { question: `Mengapa klaim ${topClaim().claim_id} dianggap berisiko?` }).map((i) => i.id);
    expect(ids).not.toContain("agg:pattern_shifts");
  });
});

describe("Copilot: tindak lanjut yang disarankan", () => {
  afterEach(() => setGovernancePolicy(defaultPolicy()));

  it("pertanyaan umum menyarankan klaim teratas yang nyata", async () => {
    setGovernancePolicy({ ...defaultPolicy(), copilot_mode: "DETERMINISTIC_ONLY" });
    const r = await askCopilot(getStore(), { question: "Faskes mana yang paling berisiko dan apa polanya?" });
    expect(r.suggested_followups.length).toBeGreaterThan(0);
    expect(r.suggested_followups[0]).toBe(`Mengapa klaim ${topClaim().claim_id} dianggap berisiko?`);
  });

  it("jawaban mode aturan memakai nama jenis risiko yang sama dengan antarmuka", async () => {
    setGovernancePolicy({ ...defaultPolicy(), copilot_mode: "DETERMINISTIC_ONLY" });
    const c = topClaim();
    const r = await askCopilot(getStore(), { question: `Mengapa klaim ${c.claim_id} dianggap berisiko?` });
    expect(readable(r.answer)).not.toMatch(RAW_CODE);
    expect(r.answer).toContain(RISK_TYPE_LABEL[c.risk_findings[0].risk_type]);
  });
});

describe("Copilot: pertanyaan peringkat dijawab dari daftar teratas walau ada klaim dalam lingkup", () => {
  const claimId = () => topClaim().claim_id;
  const ids = (q: string) => buildContext(getStore(), { question: q, claim_id: claimId() }).map((i) => i.id);

  it("faskes mana yang paling berisiko membawa daftar faskes, bukan hanya faskes klaim itu", () => {
    expect(ids("Faskes mana yang paling berisiko?")).toContain("list:top_providers");
  });

  it("klaim mana yang paling berisiko membawa daftar klaim teratas", () => {
    expect(ids("Klaim mana yang paling berisiko?")).toContain("list:top_claims");
  });

  it("pertanyaan tentang klaim itu sendiri tidak membawa daftar peringkat", () => {
    const list = ids("Mengapa klaim ini berisiko tinggi?");
    expect(list).not.toContain("list:top_providers");
    expect(list).not.toContain("list:top_claims");
    expect(ids("Bagaimana profil risiko dan pola klaim di RSUD Jakarta Selatan?")).not.toContain("list:top_providers");
  });

  it("visual faskes ikut menampilkan daftar teratas pada pertanyaan peringkat dengan klaim dalam lingkup", () => {
    const store = getStore();
    const items = buildContext(store, { question: "Faskes mana yang paling berisiko?", claim_id: claimId() });
    const v = buildVisuals(store, items, "").find((x) => x.kind === "providers");
    expect(v && v.kind === "providers" ? v.rows.length : 0).toBeGreaterThan(1);
  });
});

describe("Copilot: 'klaim ini' merujuk klaim yang terakhir dibahas", () => {
  const history = [
    { visuals: [{ kind: "claim", claim_id: "CLM-10001" }] },
    { visuals: [{ kind: "providers" }] },
    { visuals: [{ kind: "claim", claim_id: "CLM-10002" }] },
    { visuals: undefined },
  ];

  it("memakai klaim terakhir yang tampil pada percakapan", () => {
    expect(focusClaimFor("Mengapa klaim ini berisiko tinggi?", history)).toBe("CLM-10002");
    expect(focusClaimFor("Apakah kasus tersebut wajar?", history)).toBe("CLM-10002");
  });

  it("tidak ada fokus bila pertanyaan menyebut ID, tidak menunjuk klaim, atau belum ada klaim dibahas", () => {
    expect(focusClaimFor("Mengapa klaim CLM-10099 berisiko?", history)).toBeUndefined();
    expect(focusClaimFor("Faskes mana yang paling berisiko?", history)).toBeUndefined();
    expect(focusClaimFor("Mengapa klaim ini berisiko?", [{ visuals: [{ kind: "providers" }] }])).toBeUndefined();
    expect(focusClaimFor("Mengapa klaim ini berisiko?", [])).toBeUndefined();
  });
});
