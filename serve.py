#!/usr/bin/env python3
"""เซิร์ฟเวอร์ในเครื่อง:  python serve.py [พอร์ต] [--isolate]
- เสิร์ฟหน้าเว็บ (เข้าได้เฉพาะเครื่องนี้ที่ 127.0.0.1)
- โหมด "เปิดด้วยโปรแกรมในเครื่อง": อ่านรายการเกมจากโฟลเดอร์ที่ตั้งใน emulators.json แล้วสั่งเปิดอีมู (3DS, PS2, Wii ฯลฯ)
--isolate เปิด header ที่ core บางตัว (เช่น PSP) ต้องใช้ แต่ทำให้โหลดอีมูจาก CDN ไม่ได้ ใช้ร่วมกับโหมดออฟไลน์ใน README เท่านั้น"""
import json, os, subprocess, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
ISOLATE = "--isolate" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
PORT = int(args[0]) if args else 8000
CONFIG = os.environ.get("AE_CONFIG", os.path.join(HERE, "emulators.json"))
MAX_DEPTH, MAX_FILES = 4, 3000


def load_config():
    """อ่านทุกครั้งที่เรียก แก้ไฟล์แล้วไม่ต้องรีสตาร์ทเซิร์ฟเวอร์"""
    try:
        with open(CONFIG, encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, ValueError):
        return {}
    return {k: v for k, v in cfg.items() if not k.startswith("_") and isinstance(v, dict)}


def status(entry):
    exe, games = entry.get("exe", ""), entry.get("games", "")
    return {"exe": exe, "games": games, "exe_ok": os.path.isfile(exe), "games_ok": os.path.isdir(games)}


def list_games(entry):
    root = os.path.realpath(entry["games"])
    exts = {e.lower().lstrip(".") for e in entry.get("ext", [])}
    out = []
    for d, dirs, files in os.walk(root):
        if d[len(root):].count(os.sep) >= MAX_DEPTH:
            dirs[:] = []
        for f in files:
            if f.rsplit(".", 1)[-1].lower() in exts and "." in f:
                p = os.path.join(d, f)
                try:
                    size = os.path.getsize(p)
                except OSError:
                    continue
                out.append({"path": os.path.relpath(p, root).replace(os.sep, "/"), "name": f, "size": size})
                if len(out) >= MAX_FILES:
                    return sorted(out, key=lambda g: g["name"].lower())
    return sorted(out, key=lambda g: g["name"].lower())


def resolve_game(entry, rel):
    """รับเฉพาะไฟล์ที่อยู่ในโฟลเดอร์เกมและนามสกุลที่อนุญาตเท่านั้น (กัน ../ และ path แปลกๆ)"""
    root = os.path.realpath(entry["games"])
    p = os.path.realpath(os.path.join(root, *rel.split("/")))
    exts = {e.lower().lstrip(".") for e in entry.get("ext", [])}
    if os.path.commonpath([root, p]) != root or not os.path.isfile(p) or p.rsplit(".", 1)[-1].lower() not in exts:
        return None
    return p


class H(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *a):
        if "/api/" not in (a[0] if a else ""):
            super().log_message(fmt, *a)

    def end_headers(self):
        if ISOLATE:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    # ---------- API ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _guard(self):
        """กันเว็บอื่นแอบสั่งเปิดโปรแกรม: ต้องเรียกจากหน้าเว็บของเราเอง (host/origin ตรง + header เฉพาะ)"""
        ok_hosts = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
        if self.headers.get("Host", "") not in ok_hosts or self.headers.get("X-AE") != "1":
            self._json(403, {"error": "forbidden"})
            return False
        origin = self.headers.get("Origin")
        if origin and origin not in {f"http://{h}" for h in ok_hosts}:
            self._json(403, {"error": "forbidden"})
            return False
        return True

    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return super().do_GET()
        if not self._guard():
            return
        cfg = load_config()
        parts = u.path.strip("/").split("/")          # api native [id games]
        if parts[:2] == ["api", "native"] and len(parts) == 2:
            return self._json(200, {k: status(v) for k, v in cfg.items()})
        if parts[:2] == ["api", "native"] and len(parts) == 4 and parts[3] == "games":
            e = cfg.get(parts[2])
            if not e or not status(e)["games_ok"]:
                return self._json(404, {"error": "games folder not found"})
            return self._json(200, {"games": list_games(e)})
        self._json(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        parts = u.path.strip("/").split("/")
        if not (parts[:2] == ["api", "native"] and len(parts) == 4 and parts[3] == "launch"):
            return self._json(404, {"error": "not found"})
        if not self._guard():
            return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            rel = json.loads(self.rfile.read(min(n, 4096)) or b"{}").get("path", "")
        except (ValueError, TypeError):
            return self._json(400, {"error": "bad request"})
        e = load_config().get(parts[2])
        if not e or not status(e)["exe_ok"] or not status(e)["games_ok"]:
            return self._json(400, {"error": "not configured"})
        game = resolve_game(e, str(rel))
        if not game:
            return self._json(400, {"error": "invalid game"})
        cmd = [e["exe"]] + [a.replace("{file}", game) for a in e.get("args", ["{file}"])]
        try:
            kw = {"creationflags": 0x00000008} if os.name == "nt" else {"start_new_session": True}
            subprocess.Popen(cmd, cwd=os.path.dirname(e["exe"]), close_fds=True,
                             stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **kw)
        except OSError as ex:
            return self._json(500, {"error": f"เปิดโปรแกรมไม่ได้: {ex}"})
        print(f"เปิด: {os.path.basename(e['exe'])} ← {os.path.basename(game)}")
        self._json(200, {"ok": True})


if __name__ == "__main__":
    print(f"เปิด http://localhost:{PORT}  (กด Ctrl+C เพื่อหยุด)")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
