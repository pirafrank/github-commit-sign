#!/usr/bin/env bash

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN is not set. Exiting."
  exit 1
fi

argv=(node /app/github.js "$@")
cmd=$(printf '%q ' "${argv[@]}")
eval $cmd
