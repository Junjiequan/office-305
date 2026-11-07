#!/usr/bin/env python3
# Static server with caching switched off, for working on the game and the sprite renderer:  python3 dungeon-2d/tools/devserver.py [port]  (run from the folder that holds dungeon-2d and cs-game)
import http.server, sys
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 8090), H).serve_forever()
