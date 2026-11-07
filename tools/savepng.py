#!/usr/bin/env python3
# Tiny local server for the sprite renderer: POST /save?name=sprites/x.png with a PNG data URL (or any text) writes it under assets/.
import base64, http.server, os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        m = re.match(r'/save\?name=([\w./-]+)$', self.path)
        n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        if not m or '..' in m.group(1): self.send_response(400); self.end_headers(); return
        path = os.path.normpath(os.path.join(ROOT, m.group(1))); os.makedirs(os.path.dirname(path), exist_ok=True)
        if m.group(1).endswith('.png'): body = base64.b64decode(body.split(b',', 1)[1])
        open(path, 'wb').write(body); self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(b'ok')
    def do_OPTIONS(self): self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8092), H).serve_forever()
