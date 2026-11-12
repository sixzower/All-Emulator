#!/usr/bin/env python3
"""เซิร์ฟเวอร์เล็กๆ สำหรับรันในเครื่อง:  python serve.py [พอร์ต] [--isolate]
--isolate เปิด header ที่ core บางตัว (เช่น PSP) ต้องใช้ แต่ทำให้โหลดอีมูจาก CDN ไม่ได้ ใช้ร่วมกับโหมดออฟไลน์ใน README เท่านั้น"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ISOLATE = "--isolate" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
PORT = int(args[0]) if args else 8000

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        if ISOLATE:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

print(f"เปิด http://localhost:{PORT}  (กด Ctrl+C เพื่อหยุด)")
ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
