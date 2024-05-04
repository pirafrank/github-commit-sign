#!/usr/bin/env bash

# following commands should work without the GITHUB_TOKEN needing to be set.

echo "************** help *****************"

# test handling of single parameter
docker run --rm \
-v ./dummy:/app/dummy \
-w /app \
-e DEBUG \
github-graphql-client:latest "--help"

echo "************** version *****************"

# test handling of single parameter
docker run --rm \
-v ./dummy:/app/dummy \
-w /app \
-e DEBUG \
github-graphql-client:latest "-v"

# commands below need GITHUB_TOKEN to be set.
source .env.sh

echo "************ branch arg missing *******************"

# test handling of multiple parameters
docker run --rm \
-v ./dummy:/app/dummy \
-w /app \
-e GITHUB_TOKEN \
-e DEBUG \
github-graphql-client:latest commit -o pirafrank -r 'test-repo' -c dummy/file1.txt -m 'this is a commit msg'

echo "************** all separated *****************"

# test handling of multiple parameters
docker run --rm \
-v ./dummy:/app/dummy \
-w /app \
-e GITHUB_TOKEN \
-e DEBUG \
github-graphql-client:latest commit -o pirafrank -r 'test-repo' -b main -c dummy/file1.txt -m onewordcommitmsg

echo "************** all as one arg *****************"

# test multiple parameters surrounded by double quotes
# this is to test if the entrypoint.sh script can handle double quotes,
# because GitHub Actions will pass arguments as a single string.
docker run --rm \
-v ./dummy:/app/dummy \
-w /app \
-e GITHUB_TOKEN \
-e DEBUG \
github-graphql-client:latest "commit -o pirafrank -r "test-repo" -b main -c dummy/file1.txt -m 'this is a commit msg'"
