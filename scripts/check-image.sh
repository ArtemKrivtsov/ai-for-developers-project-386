#!/usr/bin/env bash
# Builds the Docker image, runs it the way Hexlet does and checks what it serves.
# Runs from several checkouts at once: no fixed container name or host port.
set -euo pipefail

iidfile=$(mktemp)
container=''
cleanup() {
  local status=$?
  if [[ -n $container ]]; then
    ((status == 0)) || docker logs "$container" >&2 || true
    docker rm --force "$container" >/dev/null || true
  fi
  rm -f "$iidfile"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Run the image this build produced, by its ID: a tag may be moved by a parallel run.
docker build --iidfile "$iidfile" .
container=$(docker run --detach --env PORT=8080 --publish 127.0.0.1::8080 "$(<"$iidfile")")
url="http://$(docker port "$container" 8080/tcp | head -n 1)"

# The server needs a moment to start listening.
curl --silent --output /dev/null --max-time 5 --retry 30 --retry-delay 1 --retry-all-errors \
  "$url/api/health"

expect_status() {
  local status
  status=$(curl --silent --output /dev/null --max-time 5 --write-out '%{http_code}' "$url$2")
  if [[ $status != "$1" ]]; then
    echo "GET $2: expected $1, got $status" >&2
    return 1
  fi
}

expect_status 200 /
# A direct link to a page of the SPA.
expect_status 200 /book
expect_status 200 /api/health
# An unknown API path is not a page.
expect_status 404 /api/unknown

# The server runs as PID 1, which ignores SIGTERM unless the process handles it.
# Otherwise docker stop waits out the timeout and kills the container with exit code 137.
docker stop --timeout 5 "$container" >/dev/null
exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$container")
if [[ $exit_code != 0 ]]; then
  echo "docker stop: the server did not exit on SIGTERM (exit code $exit_code)" >&2
  exit 1
fi
