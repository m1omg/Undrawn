#!/usr/bin/env python3
"""Serve UNDRAWN locally and open it in the browser.  usage: python3 play.py [port]"""
import http.server, socketserver, webbrowser, os, sys, threading
os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", port), Quiet) as httpd:
    url = f"http://127.0.0.1:{port}/"
    print("UNDRAWN is at", url, "(Ctrl+C to stop)")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try: httpd.serve_forever()
    except KeyboardInterrupt: pass
