#!/bin/sh
# Serves Office 305 on http://localhost:8090 (any static file server works just as well).
cd "$(dirname "$0")" && exec /usr/bin/python3 -m http.server "${1:-8090}"
