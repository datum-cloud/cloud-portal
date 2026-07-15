#!/usr/bin/env bash
#
# ensure-kwok.sh — idempotently install a pinned kwok/kwokctl and stand up a
# local lightweight Kubernetes API for the portal plugin registry (Tier 1).
#
# Strategy, in order of preference:
#   1. kwok binary runtime  (no Docker; fastest, smallest)
#   2. kwok docker runtime  (Docker required; used when the binary runtime
#                            can't run — e.g. no darwin kube-apiserver binary)
#   3. kind                 (contingency only, if kwok is unusable entirely)
#
# The chosen runtime is written to .devenv/runtime so `devenv:down` and status
# tooling know how the cluster was created. All state lives under .devenv/
# (gitignored): binaries in .devenv/bin, cluster state in .devenv/kwok,
# kubeconfig at .devenv/kubeconfig.
#
set -euo pipefail

KWOK_VERSION="${KWOK_VERSION:-v0.7.0}"
CLUSTER_NAME="${KWOK_CLUSTER_NAME:-portal-dev}"
# Set DEVENV_NO_KIND=1 to disable the kind contingency (fail instead).
DEVENV_NO_KIND="${DEVENV_NO_KIND:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEVENV_DIR="$REPO_ROOT/.devenv"
BIN_DIR="$DEVENV_DIR/bin"
KUBECONFIG_OUT="$DEVENV_DIR/kubeconfig"
RUNTIME_FILE="$DEVENV_DIR/runtime"

export KWOK_WORKDIR="$DEVENV_DIR/kwok"
mkdir -p "$BIN_DIR" "$KWOK_WORKDIR"
export PATH="$BIN_DIR:$PATH"

log() { printf '\033[36m[ensure-kwok]\033[0m %s\n' "$*" >&2; }
warn() { printf '\033[33m[ensure-kwok]\033[0m %s\n' "$*" >&2; }
err() { printf '\033[31m[ensure-kwok]\033[0m %s\n' "$*" >&2; }

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64 | amd64) ARCH="amd64" ;;
  arm64 | aarch64) ARCH="arm64" ;;
  *)
    err "unsupported architecture: $ARCH"
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Binary install (pinned GitHub release download, brew fallback)
# ---------------------------------------------------------------------------
has_version() {
  # $1 = path to binary; returns 0 if it reports the pinned version.
  local bin="$1"
  [[ -x "$bin" ]] || return 1
  "$bin" --version 2>/dev/null | grep -q -- "${KWOK_VERSION#v}"
}

download_binary() {
  # $1 = component name (kwok|kwokctl)
  local name="$1"
  local dest="$BIN_DIR/$name"
  local url="https://github.com/kubernetes-sigs/kwok/releases/download/${KWOK_VERSION}/${name}-${OS}-${ARCH}"

  if has_version "$dest"; then
    log "$name ${KWOK_VERSION} already present"
    return 0
  fi

  log "downloading $name ${KWOK_VERSION} for ${OS}/${ARCH}"
  if curl -fsSL --connect-timeout 15 --max-time 120 "$url" -o "$dest.tmp"; then
    chmod +x "$dest.tmp"
    mv "$dest.tmp" "$dest"
    return 0
  fi

  rm -f "$dest.tmp"
  return 1
}

install_via_brew() {
  command -v brew >/dev/null 2>&1 || return 1
  warn "release download failed; falling back to 'brew install kwok'"
  brew install kwok >&2 || return 1
  local prefix
  prefix="$(brew --prefix)"
  for name in kwok kwokctl; do
    if [[ -x "$prefix/bin/$name" ]]; then
      ln -sf "$prefix/bin/$name" "$BIN_DIR/$name"
    fi
  done
}

ensure_binaries() {
  local ok=1
  download_binary kwokctl || ok=0
  download_binary kwok || ok=0
  if [[ "$ok" -ne 1 ]]; then
    install_via_brew || {
      err "could not install kwok/kwokctl via release download or brew"
      return 1
    }
  fi
  log "kwokctl: $("$BIN_DIR/kwokctl" --version 2>/dev/null || echo unknown)"
}

# ---------------------------------------------------------------------------
# Cluster lifecycle
# ---------------------------------------------------------------------------
kwok_cluster_exists() {
  "$BIN_DIR/kwokctl" get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"
}

create_kwok_cluster() {
  # $1 = runtime (binary|docker)
  local runtime="$1"
  log "creating kwok cluster '$CLUSTER_NAME' (runtime: $runtime)"
  if "$BIN_DIR/kwokctl" create cluster \
    --name "$CLUSTER_NAME" \
    --runtime "$runtime" \
    --wait 90s; then
    return 0
  fi
  warn "kwok $runtime runtime failed; cleaning up partial cluster"
  "$BIN_DIR/kwokctl" delete cluster --name "$CLUSTER_NAME" >/dev/null 2>&1 || true
  return 1
}

write_kwok_kubeconfig() {
  "$BIN_DIR/kwokctl" get kubeconfig --name "$CLUSTER_NAME" >"$KUBECONFIG_OUT"
  log "wrote kubeconfig -> $KUBECONFIG_OUT"
}

create_kind_cluster() {
  command -v kind >/dev/null 2>&1 || return 1
  warn "kwok unusable on this machine; falling back to kind (contingency)"
  if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
    kind create cluster --name "$CLUSTER_NAME" --wait 120s || return 1
  fi
  kind get kubeconfig --name "$CLUSTER_NAME" >"$KUBECONFIG_OUT"
  log "wrote kubeconfig -> $KUBECONFIG_OUT"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  # If a cluster + kubeconfig already exist for a known runtime, we're done.
  if [[ -f "$RUNTIME_FILE" && -s "$KUBECONFIG_OUT" ]]; then
    local existing
    existing="$(cat "$RUNTIME_FILE")"
    case "$existing" in
      kwok-*)
        if ensure_binaries && kwok_cluster_exists; then
          log "cluster '$CLUSTER_NAME' already up (runtime: $existing)"
          write_kwok_kubeconfig
          exit 0
        fi
        ;;
      kind)
        if command -v kind >/dev/null 2>&1 && kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
          log "cluster '$CLUSTER_NAME' already up (runtime: kind)"
          exit 0
        fi
        ;;
    esac
    warn "recorded runtime '$existing' but cluster is gone; recreating"
    rm -f "$RUNTIME_FILE"
  fi

  # Try kwok first.
  if ensure_binaries; then
    if kwok_cluster_exists; then
      log "kwok cluster '$CLUSTER_NAME' already exists"
      write_kwok_kubeconfig
      # Best-effort record; default to binary if unknown.
      [[ -f "$RUNTIME_FILE" ]] || echo "kwok-binary" >"$RUNTIME_FILE"
      exit 0
    fi
    if create_kwok_cluster binary; then
      write_kwok_kubeconfig
      echo "kwok-binary" >"$RUNTIME_FILE"
      exit 0
    fi
    if create_kwok_cluster docker; then
      write_kwok_kubeconfig
      echo "kwok-docker" >"$RUNTIME_FILE"
      exit 0
    fi
    warn "both kwok runtimes failed on this machine"
  else
    warn "kwok binaries unavailable"
  fi

  # Contingency: kind.
  if [[ "$DEVENV_NO_KIND" == "1" ]]; then
    err "kwok failed and kind fallback disabled (DEVENV_NO_KIND=1)"
    exit 1
  fi
  if create_kind_cluster; then
    echo "kind" >"$RUNTIME_FILE"
    exit 0
  fi

  err "failed to create a local cluster via kwok (binary/docker) or kind."
  err "Ensure Docker is running (kwok docker runtime / kind) or that kwok"
  err "release binaries are reachable, then re-run 'task devenv:up'."
  exit 1
}

main "$@"
