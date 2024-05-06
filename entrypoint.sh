#!/usr/bin/env bash

set -e

# if the first argument is not an option, a command has been issued,
# and we need to check if the GITHUB_TOKEN is set.
if [[ "$1" != -* ]] && [[ -z "$GITHUB_TOKEN" ]]; then
  echo "GITHUB_TOKEN is not set. Exiting."
  exit 1
fi

if [[ "$DEBUG" == "true" ]]; then
  echo "first arg"
  echo $1
  echo "all args:"
  echo $@
fi

eval "node /app/github.js $@"
