FROM node:20-bookworm-slim

# going headless
ENV DEBIAN_FRONTEND=noninteractive

COPY . /app/
COPY ./entrypoint.sh /entrypoint.sh

# IMPORTANT:
#
# GitHub sets the working directory path in the GITHUB_WORKSPACE
# environment variable. It's recommended to not use the WORKDIR
# instruction in your Dockerfile
#
# docs: https://docs.github.com/en/actions/creating-actions/dockerfile-support-for-github-actions#workdir

RUN cd /app && npm install --omit=dev

ENTRYPOINT ["/entrypoint.sh"]
