#!/usr/bin/env bash
#
# sync brainrot-translations to digitalocean spaces using s3cmd.
#
# usage:
#   1) install s3cmd if you haven't: https://s3tools.org/download
#   2) either configure s3cmd with `s3cmd --configure`
#       or set environment vars DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_ENDPOINT, DO_SPACES_BUCKET
#   3) ./sync_translations.sh [--dry-run]
#
# examples:
#   ./sync_translations.sh
#   DO_SPACES_KEY=abc123 DO_SPACES_SECRET=xyz789 \
#     DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com \
#     DO_SPACES_BUCKET=brainrot-bucket \
#     ./sync_translations.sh --dry-run

set -euo pipefail

###########################
# parse arguments
###########################
DRY_RUN=false

function usage() {
  echo "usage: $(basename "$0") [--dry-run]"
  echo "       runs s3cmd sync from ./translations to your DO bucket."
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      echo "unknown option: $1"
      usage
      ;;
  esac
done

###########################
# check prerequisites
###########################
if ! command -v s3cmd &>/dev/null; then
  echo "error: s3cmd not found. please install s3cmd (https://s3tools.org)."
  exit 1
fi

if [[ ! -d "translations" ]]; then
  echo "error: 'translations' folder not found in the current directory."
  echo "please run this script from the project's root where 'translations/' exists."
  exit 1
fi

###########################
# assemble s3cmd parameters
###########################
S3CMD_PARAMS=()
TARGET=""

if [[ -n "${DO_SPACES_KEY:-}" && -n "${DO_SPACES_SECRET:-}" && -n "${DO_SPACES_ENDPOINT:-}" && -n "${DO_SPACES_BUCKET:-}" ]]; then
  # use the environment vars directly in s3cmd
  S3CMD_PARAMS+=( "--access_key=${DO_SPACES_KEY}" )
  S3CMD_PARAMS+=( "--secret_key=${DO_SPACES_SECRET}" )
  S3CMD_PARAMS+=( "--host=${DO_SPACES_ENDPOINT}" )
  # this pattern inserts the bucket name into the host for path-based addressing
  S3CMD_PARAMS+=( "--host-bucket=%(bucket)s.${DO_SPACES_ENDPOINT}" )

  TARGET="s3://${DO_SPACES_BUCKET}/translations/"
else
  # fallback: rely on the s3cmd config file (i.e. ~/.s3cfg)
  echo "note: DO_SPACES_* environment vars not found."
  echo "assuming s3cmd is already configured for your DO bucket in ~/.s3cfg."
  echo "if it's not, run: s3cmd --configure"
  echo ""
  # set a default bucket path here—or require the user to update it below:
  TARGET="s3://my-fallback-bucket/translations/"
fi

###########################
# show a friendly banner
###########################
cat <<EOF
======================================
 brainrot-translations sync with s3cmd
======================================
source:  ./translations/
target:  $TARGET

EOF

###########################
# build the actual sync command
###########################
SYNC_CMD=( s3cmd sync "${S3CMD_PARAMS[@]}" )

if [ "$DRY_RUN" = true ]; then
  SYNC_CMD+=( "--dry-run" )
  echo "running in DRY RUN mode (nothing actually gets uploaded)."
fi

SYNC_CMD+=( "translations/" "$TARGET" )

echo "about to run: ${SYNC_CMD[*]}"
echo ""

###########################
# do the sync
###########################
"${SYNC_CMD[@]}"

echo ""
echo "sync complete. have a delightful day!"
