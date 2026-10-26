"""Transcribe call recordings on the owner's laptop, offline and free.

Recordings from the phone land in a folder (AMFIRE_CALLS_DIR, default
D:\\AMFIRE\\calls), synced by Google Drive, a USB copy or any sync app.
Each new recording becomes transcripts/<name>.json with the phone number and
time read from the file name, the text and timed segments. Claude then matches
each transcript to the logged call (HQ connector: find_call_touch), attaches its
review (attach_call_analysis) and moves the JSON to transcripts/attached/.

    py -3.12 scripts/calls/transcribe.py            # new recordings only
    py -3.12 scripts/calls/transcribe.py --model large-v3-turbo

Needs: py -3.12 -m pip install faster-whisper "av==14.2.0"
(faster-whisper 1.2 breaks with PyAV 15+, which dropped an argument it uses.)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

AUDIO = {".m4a", ".mp3", ".wav", ".aac", ".amr", ".ogg", ".opus", ".3gp", ".3gpp", ".flac", ".webm"}
IST = timezone(timedelta(hours=5, minutes=30))

# Date-time patterns phone recorders put in file names, most specific first.
DATE_PATTERNS = [
    (re.compile(r"(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})[ _T-]?(\d{2})[-_.:]?(\d{2})[-_.:]?(\d{2})"), "%Y%m%d%H%M%S"),
    (re.compile(r"(?<!\d)(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?!\d)"), "%y%m%d%H%M%S"),
]
PHONE = re.compile(r"\+?\d(?:[ \-]?\d){9,12}")


def parse_name(stem: str) -> dict:
    """Phone number, contact name and time from a recorder's file name."""
    started = None
    rest = stem
    for pattern, fmt in DATE_PATTERNS:
        m = pattern.search(rest)
        if not m:
            continue
        try:
            started = datetime.strptime("".join(m.groups()), fmt).replace(tzinfo=IST)
        except ValueError:
            continue
        rest = rest[: m.start()] + " " + rest[m.end() :]
        break
    phone = None
    for m in PHONE.finditer(rest):
        digits = re.sub(r"\D", "", m.group())
        if 10 <= len(digits) <= 13:
            phone = digits[-10:]
            rest = rest.replace(m.group(), " ")
            break
    name = re.sub(r"(?i)\b(call|recording|record|rec|with|on|at)\b", " ", rest)
    name = re.sub(r"[_()\[\]+-]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    # Leftover digits (a recorder repeating the number) aren't a name.
    name = None if not name or name.replace(" ", "").isdigit() else name
    return {"phone": phone, "contactName": name, "startedAt": started}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dir", default=os.environ.get("AMFIRE_CALLS_DIR", r"D:\AMFIRE\calls"), help="folder with call recordings")
    ap.add_argument("--model", default=os.environ.get("AMFIRE_WHISPER_MODEL", "small"), help="tiny, base, small, medium, large-v3-turbo")
    ap.add_argument("--language", default=None, help="force a language, e.g. hi or en (default: detect per call)")
    ap.add_argument("--limit", type=int, default=200, help="most recordings to transcribe in one run")
    args = ap.parse_args()

    calls = Path(args.dir)
    out = calls / "transcripts"
    (out / "attached").mkdir(parents=True, exist_ok=True)
    done = {p.stem for p in out.glob("*.json")} | {p.stem for p in (out / "attached").glob("*.json")}
    todo = sorted(
        (p for p in calls.iterdir() if p.is_file() and p.suffix.lower() in AUDIO and p.stem not in done),
        key=lambda p: p.stat().st_mtime,
    )[: args.limit]
    if not todo:
        print(json.dumps({"new": 0, "folder": str(calls)}))
        return 0

    from faster_whisper import WhisperModel  # imported late so --help works without it

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    results = []
    for path in todo:
        meta = parse_name(path.stem)
        started = meta["startedAt"] or datetime.fromtimestamp(path.stat().st_mtime, IST)
        t0 = time.time()
        try:
            segments, info = model.transcribe(
                str(path),
                language=args.language,
                vad_filter=True,
                beam_size=5,
                # Hinglish calls: a prompt in mixed script nudges the decoder to keep both.
                initial_prompt="Namaste, main AMFIRE se bol raha hoon. WhatsApp AI, demo, price, showroom, clinic.",
            )
            segs = [{"start": round(s.start, 1), "end": round(s.end, 1), "text": s.text.strip()} for s in segments]
        except Exception as err:  # a corrupt or unsupported file shouldn't stop the batch
            print(json.dumps({"file": path.name, "error": str(err)}), file=sys.stderr)
            continue
        record = {
            "file": path.name,
            "path": str(path),
            "phone": meta["phone"],
            "contactName": meta["contactName"],
            "startedAt": started.isoformat(),
            "durationSec": round(info.duration),
            "language": info.language,
            "languageProbability": round(info.language_probability, 2),
            "model": args.model,
            "text": " ".join(s["text"] for s in segs),
            "segments": segs,
        }
        (out / f"{path.stem}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
        results.append({"file": path.name, "phone": meta["phone"], "startedAt": record["startedAt"], "durationSec": record["durationSec"], "seconds": round(time.time() - t0)})

    print(json.dumps({"new": len(results), "folder": str(calls), "transcripts": results}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
