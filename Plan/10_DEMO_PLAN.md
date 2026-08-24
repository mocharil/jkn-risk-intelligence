# Hackathon Demo Plan

## Demo objective

Show an investigation platform, not merely an AI chatbot or fraud classifier.

Key message: "JKN Risk Intelligence menggabungkan kontrol deterministik, kecerdasan similaritas, pengambilan evidence, dan penalaran Gemini yang grounded dalam satu alur kerja investigator."

## Pre-demo checklist

- [ ] Run demo reset script to ensure clean data state
- [ ] Verify Gemini API is responsive (test one query)
- [ ] Verify Supabase is accessible
- [ ] Verify Vercel deployment is live and latest
- [ ] Clear browser cache and cookies
- [ ] Set browser to 1440px resolution
- [ ] Prepare fallback screenshot deck (in case of live demo failure)
- [ ] Test internet connectivity
- [ ] Close unnecessary browser tabs
- [ ] Disable browser notifications and system popups

## 5-minute storyline

### 1. Command Center (60 seconds)

**Show:**
- KPI overview: 1.28M claims analyzed, 47,281 high-risk, Rp 824.6B exposure
- Indonesia Risk Map with province hotspots (Jakarta, West Java highlighted)
- AI Intelligence Briefing: "Gemini mendeteksi peningkatan tidak biasa..."
- Emerging risk signals: Upcoding Surge, Phantom Billing Cluster

**Talking points:**
- "Ini bukan dashboard biasa. Ini command center intelijen risiko."
- "Peta Indonesia menunjukkan hotspot risiko secara real-time."
- "AI Briefing memberikan ringkasan eksekutif tanpa perlu membaca ribuan klaim."

**Fallback:** Screenshot of Command Center with annotated callouts.

---

### 2. Provider drill-down (45 seconds)

Open RS Sehat Sentosa (hero provider) from Command Center hotspot.

**Show:**
- Provider risk score: 92 (HIGH)
- Risk composition: Upcoding 48%, Phantom Billing 24%
- Peer comparison: severity 3 claims 42% vs peer median 18%
- Provider risk trend (increasing)

**Talking points:**
- "Platform membantu melihat pola risiko di level provider, bukan hanya per klaim."
- "Peer comparison menunjukkan deviasi dari perilaku normal."

**Fallback:** Screenshot of provider detail page.

---

### 3. Claim investigation (90 seconds)

Open hero claim CLM-10293.

**Show:**
- Upcoding signal: 92% confidence
- Phantom Billing signal: 81% confidence
- Abnormal LOS signal: 74% confidence
- Evidence board: supporting vs contradicting evidence
- Similar claims with high similarity scores
- Timeline with suspicious gaps highlighted

**Talking points:**
- "Platform tidak hanya mengatakan 'klaim ini mencurigakan'. Ia menjelaskan MENGAPA."
- "Evidence board menunjukkan bukti mana yang mendukung dan mana yang bertentangan."
- "Similar claims mendeteksi pola kloning narasi medis."

**Fallback:** Screenshot of Investigation Workspace with evidence tab.

---

### 4. AI Copilot (60 seconds)

Ask: "Mengapa klaim ini berisiko tinggi?"

Then: "Bandingkan dengan klaim serupa."

**Show:**
- Streaming AI response with evidence references
- Structured analysis (not generic chat bubble)
- Evidence citations clickable
- Suggested next actions

**Talking points:**
- "Gemini menjawab hanya berdasarkan evidence yang tersedia, bukan mengarang."
- "Setiap pernyataan AI didukung oleh referensi evidence yang bisa diverifikasi."
- "Jika evidence tidak cukup, AI akan mengatakan 'INSUFFICIENT_EVIDENCE', bukan menebak."

**Fallback:** Pre-recorded screen capture of AI Copilot in action (5-second clip). Or screenshot with annotated AI response.

---

### 5. Human decision (30 seconds)

Set investigation status to `CONFIRMED_RISK` or `NEED_EVIDENCE`.

**Show:**
- Status transition
- Decision persists
- Audit trail captured

**Talking points:**
- "AI membantu, tapi keputusan akhir tetap di tangan investigator manusia."
- "Setiap keputusan tercatat dalam audit log untuk akuntabilitas."

**Fallback:** Screenshot of status change confirmation.

---

### 6. Adaptability (30 seconds)

Open Data Management and show schema mapping.

**Show:**
- Two differently shaped CSV files
- AI-suggested mapping with confidence scores
- Same canonical schema, same risk engine
- Visual mapping connections (NO_SEP → claim_id)

**Talking points:**
- "Platform bersifat source-agnostic. Format data berbeda bisa di-mapping ke schema yang sama."
- "Risk engine tidak perlu diubah ketika format sumber berubah."

**Fallback:** Screenshot of schema mapping interface.

---

## Timing summary

| Section | Duration | Cumulative |
|---|---|---|
| Command Center | 60s | 1:00 |
| Provider drill-down | 45s | 1:45 |
| Claim investigation | 90s | 3:15 |
| AI Copilot | 60s | 4:15 |
| Human decision | 30s | 4:45 |
| Adaptability | 30s | 5:15 |
| Buffer | -15s | 5:00 |

Total: 5 minutes with 15-second buffer.

## Risk mitigation

| Failure scenario | Mitigation |
|---|---|
| Gemini API is down | Use cached AI response from previous run. Show: "Ini contoh respons AI dari sesi sebelumnya." |
| Supabase is unreachable | Switch to local/fallback screenshot deck |
| Internet is slow | Pre-load all pages in browser tabs before demo starts |
| Demo data is wrong | Run reset script. If it fails, use screenshot deck. |
| Browser crashes | Have a second browser window ready with same pages |
| Projector resolution issues | Test at 720p, 1080p, and 1440p before presentation |

## Closing message

"JKN Risk Intelligence Platform menggabungkan kontrol deterministik, kecerdasan similaritas, pengambilan evidence, dan penalaran Gemini yang grounded dalam satu alur kerja investigator.

Platform ini bukan sekadar AI chatbot atau fraud classifier. Ia membantu investigator memahami MENGAPA sesuatu mencurigakan, APA evidence yang mendukung, dan APA yang harus diinvestigasi selanjutnya."
