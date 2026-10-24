#!/bin/bash
set -Eeuo pipefail

read_secret() {
  local target_name="$1"
  local file_name="$2"
  local file_path="${!file_name:-}"

  if [[ -z "$file_path" || ! -f "$file_path" ]]; then
    echo "Required Keycloak secret file is unavailable" >&2
    exit 1
  fi

  local value
  value="$(<"$file_path")"
  if [[ -z "$value" ]]; then
    echo "Required Keycloak secret file is empty" >&2
    exit 1
  fi
  export "$target_name=$value"
}

read_secret KC_DB_PASSWORD KC_DB_PASSWORD_FILE

if [[ -n "${CORE_KEYCLOAK_CLIENT_SECRET_FILE:-}" ]]; then
  read_secret CORE_KEYCLOAK_CLIENT_SECRET CORE_KEYCLOAK_CLIENT_SECRET_FILE
fi

exec /opt/keycloak/bin/kc.sh "$@"
