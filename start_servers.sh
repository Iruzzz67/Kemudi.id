#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
api_pid=''
web_pid=''

cleanup() {
  if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; fi
  if [[ -n "$web_pid" ]]; then kill "$web_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

if ! curl --silent --fail http://127.0.0.1:5077/api/vehicles >/dev/null; then
  (cd "$project_root/src/Kemudi.Api" && dotnet run --no-launch-profile --urls http://127.0.0.1:5077) &
  api_pid=$!
fi
if ! curl --silent --fail http://127.0.0.1:5259/login >/dev/null; then
  (cd "$project_root/src/Kemudi.Web" && dotnet run --no-launch-profile --urls http://127.0.0.1:5259) &
  web_pid=$!
fi

for attempt in {1..60}; do
  if curl --silent --fail http://127.0.0.1:5077/api/vehicles >/dev/null \
    && curl --silent --fail http://127.0.0.1:5259/login >/dev/null; then
    printf 'API: http://127.0.0.1:5077\nWeb: http://127.0.0.1:5259/login\n'
    if [[ -n "$api_pid" || -n "$web_pid" ]]; then wait; fi
    exit 0
  fi
  sleep 1
done

printf 'Server belum siap setelah 60 detik. Periksa output dotnet di atas.\n' >&2
exit 1
