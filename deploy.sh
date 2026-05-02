#!/bin/bash
# Deploy nhl-stats to the GCP Compute Engine VM.
# Usage: ./deploy.sh <host-or-url> [ssh-user]
#
# Examples:
#   ./deploy.sh https://nhl-stats.jesco39.com
#   ./deploy.sh nhl-stats.jesco39.com
#   ./deploy.sh 34.56.78.90

set -euo pipefail

RAW_TARGET="${1:?Usage: ./deploy.sh <host-or-url> [ssh-user]}"
REMOTE_USER="${2:-jesco}"
APP_DIR="/opt/nhl-stats"

HOST=$(echo "$RAW_TARGET" | sed -E 's#^[a-z]+://##; s#/.*$##')

if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    REMOTE_HOST="$HOST"
else
    REMOTE_HOST=$(dig +short "$HOST" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | tail -n1)
    if [ -z "$REMOTE_HOST" ]; then
        echo "Could not resolve $HOST to an IP" >&2
        exit 1
    fi
    echo "==> Resolved $HOST -> $REMOTE_HOST"
fi

REMOTE="$REMOTE_USER@$REMOTE_HOST"

GCE_KEY="$HOME/.ssh/google_compute_engine"
if [ -f "$GCE_KEY" ]; then
    ssh-add "$GCE_KEY" >/dev/null 2>&1 || true
fi

echo "==> Cross-compiling for Linux amd64..."
cd "$(dirname "$0")"
GOOS=linux GOARCH=amd64 go build -o nhl-stats-linux .

echo "==> Uploading files to ${REMOTE}:${APP_DIR}..."
scp nhl-stats-linux "${REMOTE}:/tmp/nhl-stats"
ssh "$REMOTE" "sudo mv /tmp/nhl-stats ${APP_DIR}/nhl-stats && sudo chmod +x ${APP_DIR}/nhl-stats"
rm -f nhl-stats-linux

scp -r templates "${REMOTE}:/tmp/nhl-stats-templates"
scp -r static "${REMOTE}:/tmp/nhl-stats-static"
ssh "$REMOTE" "sudo rm -rf ${APP_DIR}/templates ${APP_DIR}/static && \
    sudo mv /tmp/nhl-stats-templates ${APP_DIR}/templates && \
    sudo mv /tmp/nhl-stats-static ${APP_DIR}/static"

ssh "$REMOTE" "sudo chown -R nhl-stats:nhl-stats ${APP_DIR}"

echo "==> Restarting nhl-stats service..."
ssh "$REMOTE" "sudo systemctl restart nhl-stats"

echo "==> Service status:"
ssh "$REMOTE" "sudo systemctl status nhl-stats --no-pager" || true

echo ""
echo "==> Deploy complete! https://nhl-stats.jesco39.com"
