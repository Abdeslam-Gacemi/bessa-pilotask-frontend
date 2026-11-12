#!/usr/bin/env bash
# =============================================================================
#  deploy.sh - Bessa Pilotask web app deploy
#
#  Usage:
#    sudo bash ./deploy.sh [--no-pull] [--force] [--web-root=DIR]
#                          [VITE_API_URL=https://host/api]
#
#  The web app is published as static files; the backend stack's nginx serves
#  them (bessa-pilotask-backend/deploy/nginx.conf), so both share one origin
#  and one port (8013):
#
#    /api, /up           -> Laravel
#    everything else     -> the release published here
#
#  This script therefore builds only. It publishes into
#    ${WEB_ROOT}/releases/<timestamp>   and switches ${WEB_ROOT}/current.
#  Nothing here starts a container or binds a port.
#
#  Requirements:
#    - deploy key at <your home>/.ssh/pilotask_frontend (git pull over SSH)
#    - Docker, and the backend stack already deployed (sudo bash deploy.sh
#      in bessa-pilotask-backend)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- Colors ----------------------------------------------------------------
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
info()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---- Flags -----------------------------------------------------------------
PULL=true
FORCE=false
WEB_ROOT="${WEB_ROOT:-/opt/pilotask/web}"
PUBLIC_PORT="${PUBLIC_PORT:-${HTTP_PORT:-8013}}"
RELEASES_KEPT=3

for arg in "$@"; do
  case "$arg" in
    --no-pull)  PULL=false ;;
    --force)    FORCE=true ;;
    --web-root) error "--web-root needs a directory"; exit 1 ;;
    --web-root=*) WEB_ROOT="${arg#*=}" ;;
    *=*)        export "$arg" ;;
    *)
      error "Unknown option: $arg"
      echo "  Usage: ./deploy.sh [--no-pull] [--force] [--web-root=DIR] [VITE_API_URL=...]"
      exit 1
      ;;
  esac
done

# ---- Who is really running this --------------------------------------------
# `sudo` rewrites HOME to /root, so resolve the key from the invoking user.
if [ "$(id -u)" -eq 0 ] && [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  RUN_USER="$SUDO_USER"
else
  RUN_USER="$(id -un)"
fi

RUN_HOME="$(getent passwd "$RUN_USER" 2>/dev/null | cut -d: -f6 || true)"
if [ -z "$RUN_HOME" ]; then
  RUN_HOME="$HOME"
fi

SSH_KEY="${SSH_KEY:-$RUN_HOME/.ssh/pilotask_frontend}"
GIT_SSH_CMD="ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15"

info "Preflight checks..."
info "Running as ${RUN_USER}, deploy key ${SSH_KEY}, web root ${WEB_ROOT}"

# ---- Docker access ---------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Cannot talk to the Docker daemon as ${RUN_USER}."
  echo "  Run with sudo, or add ${RUN_USER} to the docker group:"
  echo "    sudo usermod -aG docker ${RUN_USER}   # then reconnect"
  exit 1
fi

# ---- Git pull --------------------------------------------------------------
# git refuses to touch a checkout owned by another user ("dubious ownership"),
# which is what happens when the repo was cloned with sudo. Fail with the fix
# instead of letting git print its own suggestion.
if [ "$PULL" = true ] && [ -d "$SCRIPT_DIR/.git" ]; then
  REPO_OWNER="$(stat -c '%U' "$SCRIPT_DIR/.git" 2>/dev/null || echo "$RUN_USER")"
  if [ "$REPO_OWNER" != "$RUN_USER" ]; then
    error "The checkout is owned by '${REPO_OWNER}', but deploys run as '${RUN_USER}'."
    echo "  Fix it once with:"
    echo "    sudo chown -R ${RUN_USER}:${RUN_USER} ${SCRIPT_DIR}"
    echo "  Then run this script again."
    exit 1
  fi
fi

# GIT_SSH_CMD empty: no GIT_SSH_COMMAND, git uses its own setup (core.sshCommand,
# ~/.ssh/config, default keys) exactly like a plain `git pull`.
git_run() {
  local ssh_env=()
  [ -n "$GIT_SSH_CMD" ] && ssh_env=(GIT_SSH_COMMAND="$GIT_SSH_CMD")
  [ -n "${SSH_AUTH_SOCK:-}" ] && ssh_env+=(SSH_AUTH_SOCK="$SSH_AUTH_SOCK")
  if [ "$(id -u)" -eq 0 ] && [ "$RUN_USER" != "root" ]; then
    sudo -u "$RUN_USER" env HOME="$RUN_HOME" "${ssh_env[@]}" git "$@"
  else
    env "${ssh_env[@]}" git "$@"
  fi
}

# GitHub over SSH, three tries: the deploy key on port 22, the deploy key
# through ssh.github.com:443, then the deploy user's own SSH setup
# (~/.ssh/config and default keys, the same as a plain `git pull`).
# The first one that works is kept for the rest of the run.
git_remote() {
  git_run "$@" && return 0
  case "$GIT_SSH_CMD" in
    "") return 1 ;;
    *"Port=443"*) ;;
    *)
      warn "GitHub refused or unreachable on SSH port 22; retrying through port 443..."
      GIT_SSH_CMD="$GIT_SSH_CMD -o HostName=ssh.github.com -o Port=443"
      git_run "$@" && return 0
      ;;
  esac
  warn "Deploy key refused; retrying with ${RUN_USER}'s own git/SSH setup (like a plain git pull)..."
  GIT_SSH_CMD=""
  git_run "$@"
}

if [ "$PULL" = true ]; then
  if [ ! -f "$SSH_KEY" ]; then
    error "SSH key not found: $SSH_KEY"
    echo "  Put the deploy key there (chmod 600), or run ./deploy.sh --no-pull"
    echo "  to build the checkout as it is."
    exit 1
  fi
  chmod 600 "$SSH_KEY" 2>/dev/null || true

  BRANCH="$(git_run rev-parse --abbrev-ref HEAD)"

  if [ -n "$(git_run status --porcelain --untracked-files=no)" ]; then
    if [ "$FORCE" = true ]; then
      warn "Local changes found - discarding them (--force)."
      git_remote fetch --all
      git_run reset --hard "origin/$BRANCH"
    else
      error "The working tree has local changes; pulling would conflict:"
      git_run status --short --untracked-files=no
      echo "  Commit or stash them, or re-run with --force to discard them."
      exit 1
    fi
  else
    info "Pulling latest frontend (${BRANCH})..."
    git_remote fetch --all
    git_remote pull --ff-only origin "$BRANCH"
  fi

  info "At commit: $(git_run rev-parse --short HEAD)"
fi

# ---- Build-time configuration ----------------------------------------------
# Sourcing .env (instead of `export $(grep ... | xargs)`) keeps values with
# spaces or empty values intact.
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/.env"
  set +a
fi

# Same origin by default: nginx in front of the stack routes /api to Laravel,
# so the bundle works on http, https and any host without a rebuild.
API_URL="${VITE_API_URL:-/api}"
info "VITE_API_URL -> $API_URL"

# Browser push on computers: all six Firebase web keys, and the site on HTTPS
# (browsers only run the push service worker on secure origins).
FIREBASE_MISSING=""
for key in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_SENDER_ID VITE_FIREBASE_APP_ID VITE_FIREBASE_VAPID_KEY; do
  eval "value=\${$key:-}"
  [ -n "$value" ] || FIREBASE_MISSING="$FIREBASE_MISSING $key"
done
if [ -n "$FIREBASE_MISSING" ]; then
  warn "Browser push is off - missing in .env:$FIREBASE_MISSING"
else
  info "Browser push keys set (works once the site is served over HTTPS)."
fi

# ---- Build -----------------------------------------------------------------
STAMP="$(date -u +%Y%m%d-%H%M%S)"
RELEASE_DIR="$WEB_ROOT/releases/$STAMP"
BUILD_TAG="bessa-pilotask-web-build:$STAMP"

mkdir -p "$WEB_ROOT/releases"

info "Building the SPA (this takes a minute)..."
docker build \
  --target builder \
  --build-arg "VITE_API_URL=$API_URL" \
  --build-arg "VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY:-}" \
  --build-arg "VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN:-}" \
  --build-arg "VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID:-}" \
  --build-arg "VITE_FIREBASE_SENDER_ID=${VITE_FIREBASE_SENDER_ID:-}" \
  --build-arg "VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID:-}" \
  --build-arg "VITE_FIREBASE_VAPID_KEY=${VITE_FIREBASE_VAPID_KEY:-}" \
  -t "$BUILD_TAG" \
  "$SCRIPT_DIR"

# Pull the build out of the image: the runner stage of this Dockerfile is only
# for local previews, production serves the files through the backend's nginx.
CONTAINER="$(docker create "$BUILD_TAG")"
mkdir -p "$RELEASE_DIR"
docker cp "$CONTAINER:/app/dist/." "$RELEASE_DIR/"
docker rm -f "$CONTAINER" >/dev/null
docker rmi "$BUILD_TAG" >/dev/null 2>&1 || true

if [ ! -f "$RELEASE_DIR/index.html" ]; then
  error "The build produced no index.html - aborting before touching 'current'."
  rm -rf "$RELEASE_DIR"
  exit 1
fi

# nginx runs as an unprivileged user inside its container: the release must be
# world-readable. root ownership is fine.
chmod -R a+rX "$RELEASE_DIR"

# ---- Switch the release ----------------------------------------------------
# Atomic swap: a symlink rename, so nginx never sees a half-written 'current'.
if [ -e "$WEB_ROOT/current" ] && [ ! -L "$WEB_ROOT/current" ]; then
  rm -rf "$WEB_ROOT/current"
fi
# The link must be RELATIVE: nginx sees this directory mounted at /srv/web, so
# an absolute /opt/pilotask/web/... target would dangle inside the container and
# every request would fall through to the backend.
ln -sfn "releases/$STAMP" "$WEB_ROOT/.current.tmp"
mv -Tf "$WEB_ROOT/.current.tmp" "$WEB_ROOT/current"

info "Published $RELEASE_DIR"
info "current -> $(readlink "$WEB_ROOT/current")"

# ---- Retention -------------------------------------------------------------
# shellcheck disable=SC2012
ls -1dt "$WEB_ROOT"/releases/*/ 2>/dev/null | tail -n +$((RELEASES_KEPT + 1)) | xargs -r rm -rf

# ---- Sanity check ----------------------------------------------------------
# Check the content, not just the status code: the backend answers / with 200
# too, so a 200 alone would hide a dangling release.
SERVED="$(curl -fsS --max-time 5 "http://127.0.0.1:${PUBLIC_PORT}/" 2>/dev/null | head -c 4096 || true)"

if printf '%s' "$SERVED" | grep -q 'id="app"'; then
  info "Serving on port ${PUBLIC_PORT}."
elif [ -z "$SERVED" ]; then
  warn "Nothing answers on http://127.0.0.1:${PUBLIC_PORT}/."
  echo "  The backend stack owns that port; deploy it first:"
  echo "    cd /opt/pilotask/backend && sudo bash ./deploy.sh"
  echo "  The files are published, so it will pick them up as soon as it runs."
else
  warn "Port ${PUBLIC_PORT} answers, but not with this release - nginx is still"
  echo "  falling back to the backend. Check that nginx mounts ${WEB_ROOT} at /srv/web:"
  echo "    sudo docker inspect bessa-pilotask-nginx-1 \\"
  echo "      --format '{{range .Mounts}}{{.Source}} => {{.Destination}}{{\"\\n\"}}{{end}}'"
fi

info "Frontend deployed (commit $(git rev-parse --short HEAD 2>/dev/null || echo unknown))."
