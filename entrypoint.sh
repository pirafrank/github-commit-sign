#!/usr/bin/env bash

set -e
argv=(node /app/github.js "$@")
cmd=$(printf '%q ' "${argv[@]}")
eval $cmd
