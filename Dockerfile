FROM node:18-bookworm-slim

# going headless
ENV DEBIAN_FRONTEND=noninteractive

COPY . /app/
COPY ./entrypoint.sh /entrypoint.sh

RUN cd /app && npm install --omit=dev

ENTRYPOINT ["/entrypoint.sh"]
