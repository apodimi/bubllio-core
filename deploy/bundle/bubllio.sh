#!/bin/sh
set -eu

BUNDLE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
STATE_DIR=${BUBLLIO_STATE_DIR:-"$PWD/bubllio-state"}
COMPOSE_FILE="$BUNDLE_DIR/deploy/compose/compose.yaml"
ENV_FILE="$STATE_DIR/compose.env"
INSTALLER_IMAGE='__BUBLLIO_INSTALLER_IMAGE__'
RELEASE_VERSION='__BUBLLIO_RELEASE_VERSION__'

usage() {
  cat <<EOF
Bubllio Core ${RELEASE_VERSION}

Usage:
  ./bubllio prepare --base-domain <domain> --edge-network <network> [options]
  ./bubllio doctor
  ./bubllio up
  ./bubllio status
  ./bubllio down

State directory: BUBLLIO_STATE_DIR (default: ./bubllio-state)
Optional app manifest: BUBLLIO_APPLICATIONS_FILE
EOF
}

require_docker() {
  command -v docker >/dev/null 2>&1 || {
    echo "Docker is required." >&2
    exit 1
  }
  docker info >/dev/null 2>&1 || {
    echo "Docker is installed but the daemon is unavailable." >&2
    exit 1
  }
  docker compose version >/dev/null 2>&1 || {
    echo "Docker Compose v2 is required." >&2
    exit 1
  }
}

absolute_state_dir() {
  [ ! -L "$STATE_DIR" ] || {
    echo "Refusing symbolic-link state directory: $STATE_DIR" >&2
    exit 1
  }
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR"
  STATE_DIR=$(CDPATH= cd -- "$STATE_DIR" && pwd)
  ENV_FILE="$STATE_DIR/compose.env"
}

read_environment_value() {
  key=$1
  sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

doctor() {
  require_docker
  absolute_state_dir
  for path in "$ENV_FILE" "$STATE_DIR/installation.json" "$STATE_DIR/applications.json" "$STATE_DIR/secrets"; do
    [ -e "$path" ] || {
      echo "Missing installation state: $path" >&2
      echo "Run ./bubllio prepare first." >&2
      exit 1
    }
  done
  for secret in \
    core_database_password \
    identity_database_password \
    core_identity_client_secret \
    identity_setup_agent_token \
    keycloak_bootstrap_client_secret \
    setup_secret_digest \
    setup_secret_expires_at; do
    [ -f "$STATE_DIR/secrets/$secret" ] || {
      echo "Missing generated secret state: $STATE_DIR/secrets/$secret" >&2
      exit 1
    }
  done
  edge_network=$(read_environment_value BUBLLIO_EDGE_NETWORK)
  [ -n "$edge_network" ] || {
    echo "BUBLLIO_EDGE_NETWORK is missing from $ENV_FILE" >&2
    exit 1
  }
  docker network inspect "$edge_network" >/dev/null 2>&1 || {
    echo "External Docker network '$edge_network' does not exist." >&2
    echo "Create it or select the network owned by your reverse proxy." >&2
    exit 1
  }
  compose config --quiet
  echo "Bubllio ${RELEASE_VERSION} is ready to start."
}

command=${1:-help}
[ "$#" -eq 0 ] || shift

case "$command" in
  prepare)
    require_docker
    absolute_state_dir
    if [ -n "${BUBLLIO_APPLICATIONS_FILE:-}" ]; then
      applications_file=$(CDPATH= cd -- "$(dirname -- "$BUBLLIO_APPLICATIONS_FILE")" && pwd)/$(basename -- "$BUBLLIO_APPLICATIONS_FILE")
      [ -f "$applications_file" ] || {
        echo "Application manifest not found: $applications_file" >&2
        exit 1
      }
      docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network none \
        --read-only \
        --tmpfs /tmp:mode=1777 \
        --mount "type=bind,src=$BUNDLE_DIR/release-manifest.json,dst=/input/release-manifest.json,readonly" \
        --mount "type=bind,src=$applications_file,dst=/input/applications.json,readonly" \
        --mount "type=bind,src=$STATE_DIR,dst=/state" \
        "$INSTALLER_IMAGE" prepare \
        --release-manifest /input/release-manifest.json \
        --state-dir /state \
        --host-state-dir "$STATE_DIR" \
        --applications /input/applications.json \
        "$@"
    else
      docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network none \
        --read-only \
        --tmpfs /tmp:mode=1777 \
        --mount "type=bind,src=$BUNDLE_DIR/release-manifest.json,dst=/input/release-manifest.json,readonly" \
        --mount "type=bind,src=$STATE_DIR,dst=/state" \
        "$INSTALLER_IMAGE" prepare \
        --release-manifest /input/release-manifest.json \
        --state-dir /state \
        --host-state-dir "$STATE_DIR" \
        "$@"
    fi
    ;;
  doctor)
    [ "$#" -eq 0 ] || { usage >&2; exit 1; }
    doctor
    ;;
  up)
    [ "$#" -eq 0 ] || { usage >&2; exit 1; }
    doctor
    compose up -d --wait
    echo "Bubllio is running. Open the setup URL printed by prepare."
    ;;
  status)
    [ "$#" -eq 0 ] || { usage >&2; exit 1; }
    absolute_state_dir
    [ -f "$ENV_FILE" ] || { echo "Run ./bubllio prepare first." >&2; exit 1; }
    compose ps
    ;;
  down)
    [ "$#" -eq 0 ] || { usage >&2; exit 1; }
    absolute_state_dir
    [ -f "$ENV_FILE" ] || { echo "Run ./bubllio prepare first." >&2; exit 1; }
    compose down
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
