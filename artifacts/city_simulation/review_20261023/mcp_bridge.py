"""Send one command to the running Blender MCP add-on; never retries mutations."""
import argparse
import json
import socket
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('script', type=Path)
p.add_argument('--timeout', type=int, default=180)
a = p.parse_args()
command = {'type': 'execute_code', 'params': {'code': a.script.read_text(encoding='utf-8')}}
with socket.create_connection(('127.0.0.1', 9876), 10) as client:
    client.settimeout(a.timeout)
    client.sendall(json.dumps(command).encode('utf-8'))
    data = b''
    while True:
        chunk = client.recv(65536)
        if not chunk:
            raise RuntimeError('MCP connection closed before a complete response')
        data += chunk
        try:
            result = json.loads(data)
            break
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
receipt = a.script.with_suffix('.receipt.json')
receipt.write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result, indent=2))
if result.get('status') != 'success':
    raise SystemExit(1)
