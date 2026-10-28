"""Suara narasi (bahasa Inggris) untuk screencast Arsa AI, lengkap dengan waktu subtitle.

Jalankan:  python scripts/video/vo.py
Butuh:     pip install edge-tts  (memakai suara neural Microsoft Edge, perlu internet) dan ffprobe.
Hasil:     out/vo/cue-XX.mp3 dan scripts/video/assets/vo.js (jadwal cue + potongan subtitle)
Setiap cue punya durasi minimum (waktu yang dibutuhkan aksi di layar); slot cue = max(suara + jeda, minimum).
"""
import asyncio
import json
import os
import re
import subprocess

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "out", "vo")
VOICE = "en-US-AndrewNeural"
RATE = "+2%"
LEAD = 1.0  # detik sebelum cue pertama

# (id, durasi minimum aksi di layar dalam detik, naskah)
CUES = [
    ("intro", 9, "Every year, Indonesia's national health insurance handles more than eleven million inpatient admissions. Checking each one by hand is impossible."),
    ("problem", 8, "Most fraud tools answer with a score. But a score without a reason can't be audited. Arsa AI shows the evidence instead."),
    ("cc", 8, "This is the Command Center. One thousand five hundred and three claims analyzed, with three hundred and fifty million rupiah in potential exposure."),
    ("map", 8, "The risk map shows where problems cluster. The darker the green, the higher the province's risk score."),
    ("toqueue", 6, "So instead of opening every file, the verifier starts from the priority queue: sixty-five cases."),
    ("filter", 7, "Filter by finding type, for example upcoding, and the list narrows instantly."),
    ("open", 6, "Let's open the top case: a claim from RSUD Jakarta Selatan, with a risk score of ninety-nine."),
    ("why", 9, "And the score comes with reasons. The bill is sixteen point three million rupiah, almost three times the median of similar claims, and three and a half times the national BPJS average."),
    ("detectors", 6, "Two detectors fired: upcoding at ninety-eight, and unbundling at seventy-eight."),
    ("evidence", 10, "On the evidence board, the medical records contradict the bill. The discharge summary says the patient was stable, yet the claim was billed as a severe case."),
    ("graph", 9, "The relationship graph links hospitals, doctors, claims, patients and diagnoses."),
    ("cluster", 9, "Focus on the anomaly cluster, and a pattern stands out: one doctor, at one hospital, connected to six high-risk claims."),
    ("decide", 10, "The decision stays human. The supervisor confirms the risk, and has to write the reason, citing the evidence."),
    ("audit", 7, "Every decision is sealed in a SHA-256 audit chain that can only be appended, never edited."),
    ("copilot", 9, "Need a quick comparison? Ask the Copilot, in plain language."),
    ("answer", 10, "Every statement cites its source, and the comparison map appears right inside the answer."),
    ("upload", 7, "New hospital data can be uploaded as CSV, Excel or JSON."),
    ("mapping", 9, "Patient identities are pseudonymized in memory before anything is stored. Columns are mapped automatically, and a human confirms them."),
    ("ingest", 9, "Invalid rows are rejected with a clear reason. Here, forty claims are accepted and checked by all eight detectors."),
    ("honest", 11, "And we're honest about our numbers. On labelled synthetic data, recall is ninety percent, with a two point three percent false positive rate. The page says clearly that this is not yet validated on real claims."),
    ("outro", 7, "Arsa AI. Finding the claims that matter, and showing the proof."),
]


def chunks(words, max_chars=46):
    """Pecah kata bertimestamp menjadi baris subtitle pendek, utamakan pemisah tanda baca."""
    out, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["text"] for x in cur)
        end_punct = re.search(r"[.,:;?!]$", w["text"])
        if len(text) >= max_chars or (end_punct and len(text) > 22):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [{"t0": c[0]["t0"], "t1": c[-1]["t1"], "text": " ".join(x["text"] for x in c)} for c in out]


async def synth(cid, text):
    path = os.path.join(OUT, f"cue-{cid}.mp3")
    comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                t0 = ch["offset"] / 1e7
                words.append({"t0": round(t0, 3), "t1": round(t0 + ch["duration"] / 1e7, 3), "text": ch["text"]})
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())
    # Tempel tanda baca dari naskah ke kata (WordBoundary tidak membawa tanda baca)
    src = text.split()
    for i, w in enumerate(words):
        if i < len(src) and re.sub(r"[^\w']", "", src[i]).lower() == re.sub(r"[^\w']", "", w["text"]).lower():
            w["text"] = src[i]
    return path, dur, words


async def main():
    os.makedirs(OUT, exist_ok=True)
    t = LEAD
    cues = []
    for cid, min_dur, text in CUES:
        path, dur, words = await synth(cid, text)
        slot = max(dur + 0.7, min_dur)
        cues.append({"id": cid, "start": round(t, 3), "dur": round(slot, 3), "voice": round(dur, 3), "text": text, "audio": os.path.relpath(path, ROOT).replace("\\", "/"), "subs": chunks(words)})
        print(f"{cid:10s} start {t:6.2f}  suara {dur:5.2f}  slot {slot:5.2f}")
        t += slot
    total = round(t + 1.0, 3)
    with open(os.path.join(HERE, "assets", "vo.js"), "w", encoding="utf8") as f:
        f.write("window.VO = " + json.dumps({"total": total, "cues": cues}, ensure_ascii=False) + ";\n")
    print("total", total)


asyncio.run(main())
