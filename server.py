#!/usr/bin/env python3
"""Local-only static server with byte-range video seeking. No dependencies."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse,webbrowser,threading,re
ROOT=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def send_head(self):
        self._range=None
        path=Path(self.translate_path(self.path))
        if path.is_file() and self.headers.get('Range'):
            size=path.stat().st_size
            m=re.fullmatch(r'bytes=(\d*)-(\d*)',self.headers['Range'].strip())
            if not m or not any(m.groups()):return self.invalid_range(size)
            a,b=m.groups()
            if a:
                start=int(a);end=min(int(b) if b else size-1,size-1)
            else:
                length=int(b);start=max(0,size-length);end=size-1
            if start>=size or start>end:return self.invalid_range(size)
            f=path.open('rb');f.seek(start);self._range=end-start+1
            self.send_response(206);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(self._range));self.end_headers();return f
        return super().send_head()
    def invalid_range(self,size):
        self.send_response(416);self.send_header('Content-Range',f'bytes */{size}');self.send_header('Content-Length','0');self.end_headers();return None
    def end_headers(self):
        self.send_header('Cache-Control','no-cache');super().end_headers()
    def copyfile(self,source,out):
        if self._range is None:return super().copyfile(source,out)
        remaining=self._range
        try:
            while remaining:
                chunk=source.read(min(65536,remaining))
                if not chunk:break
                out.write(chunk);remaining-=len(chunk)
        except (BrokenPipeError,ConnectionResetError):pass
    def log_message(self,fmt,*args):
        if args and str(args[1]) not in ('200','206','304'):super().log_message(fmt,*args)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);p.add_argument('--open',action='store_true');a=p.parse_args()
    try:s=ThreadingHTTPServer(('127.0.0.1',a.port),Handler)
    except OSError as e:raise SystemExit(f'포트 {a.port}를 사용할 수 없습니다. --port 8766 등으로 바꾸세요. ({e})')
    url=f'http://127.0.0.1:{s.server_port}';print('TAB Studio:',url,flush=True)
    if a.open:threading.Timer(.35,lambda:webbrowser.open(url)).start()
    try:s.serve_forever()
    except KeyboardInterrupt:pass
    finally:s.server_close()
