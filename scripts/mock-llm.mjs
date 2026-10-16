// Server LLM tiruan (protokol OpenAI) untuk E2E & uji manual tanpa kunci apa pun.
//   node scripts/mock-llm.mjs [port]      -> http://localhost:4010/v1
// Perilaku: model "patuh" yang mengutip id dari KONTEKS. Pertanyaan berisi "HALUSINASI" membuat model
// mengarang sitasi (untuk membuktikan validator menolaknya).
import http from "http";

const PORT = Number(process.argv[2] || process.env.MOCK_LLM_PORT || 4010);

function ids(prompt) {
  const out = [];
  for (const m of prompt.matchAll(/^\[([^\]\n]{2,120})\]/gm)) out.push(m[1]);
  return out;
}

function embed(text) {
  const v = new Array(768).fill(0);
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9 ]/g, " ")} `;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  for (const w of t.split(/\s+/).filter(Boolean)) v[hash("w" + w) % 768] += 1;
  for (let i = 0; i + 4 <= t.length; i++) v[hash("c" + t.slice(i, i + 4)) % 768] += 0.5;
  const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / n);
}

function answerFor(prompt) {
  const all = ids(prompt);
  const hallu = /HALUSINASI/.test(prompt);
  if (hallu) return "Klaim ini pasti penipuan besar [DOC-999-99] dan [finding:CLM-0:FAKE].";
  const pick = all.slice(0, 3);
  if (pick.length === 0) return "Data tidak cukup untuk menjawab.";
  return `Ringkasan berdasarkan konteks: ${pick.map((id, i) => `fakta ke-${i + 1} tercatat [${id}]`).join("; ")}.`;
}

function jsonFor(prompt) {
  const all = ids(prompt);
  if (prompt.includes('"explanations"')) {
    const m = prompt.match(/Jenis risiko yang harus dijelaskan: ([A-Z_, ]+)\./);
    const types = m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
    const doc = all.find((i) => i.startsWith("DOC-")) || all[0];
    return { explanations: types.map((t) => ({ risk_type: t, text: `Temuan ${t} didukung dokumen [${doc}].`, cited_evidence_ids: [doc] })) };
  }
  if (prompt.includes('"mappings"')) return { mappings: [] };
  if (prompt.includes('"cited_ids"')) return { summary: "Ringkasan mingguan: eksposur dan klaim berisiko tinggi terpantau pada beberapa faskes.", key_findings: ["Faskes teratas memiliki eksposur terbesar."], cited_ids: ["agg:national"] };
  return { answer: answerFor(prompt), confidence: 0.8, suggested_followups: [], recommended_action: "INVESTIGATE" };
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
    try {
      const j = body ? JSON.parse(body) : {};
      if (req.url.endsWith("/embeddings")) return send(200, { data: (Array.isArray(j.input) ? j.input : [j.input]).map((t) => ({ embedding: embed(String(t)) })) });
      if (req.url.endsWith("/chat/completions")) {
        const prompt = (j.messages || []).map((m) => m.content).join("\n");
        if (j.max_tokens === 4) return send(200, { choices: [{ message: { content: "pong" } }] });
        if (j.stream) {
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          const text = answerFor(prompt);
          const parts = text.match(/.{1,12}/g) || [];
          let i = 0;
          const tick = () => {
            if (i < parts.length) { res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] })}\n\n`); setTimeout(tick, 5); }
            else { res.write("data: [DONE]\n\n"); res.end(); }
          };
          return tick();
        }
        const wantsJson = Boolean(j.response_format) || /JSON/.test(prompt);
        return send(200, { choices: [{ message: { content: wantsJson ? JSON.stringify(jsonFor(prompt)) : answerFor(prompt) } }] });
      }
      send(404, { error: "not found" });
    } catch (e) { send(500, { error: String(e) }); }
  });
});

server.listen(PORT, () => console.log(`mock-llm listening on http://localhost:${PORT}/v1`));
