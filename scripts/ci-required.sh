#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/ci-required.sh [all|lint|typecheck|test|validate|build]

Runs Brainrot's required PR gate lanes through repo-owned commands.
USAGE
}

if [ "${1:-}" = "--" ]; then
  shift
fi

lane="${1:-all}"

run_lint() {
  pnpm lint
}

run_typecheck() {
  pnpm typecheck
}

run_test() {
  NODE_ENV=test pnpm test:run
}

run_validate() {
  pnpm validate:all
}

run_build() {
  NODE_ENV=production pnpm build
}

case "${lane}" in
  all)
    run_lint
    run_typecheck
    run_test
    run_validate
    run_build
    ;;
  lint)
    run_lint
    ;;
  typecheck)
    run_typecheck
    ;;
  test)
    run_test
    ;;
  validate)
    run_validate
    ;;
  build)
    run_build
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
