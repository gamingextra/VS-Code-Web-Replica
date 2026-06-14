FROM oven/bun:1 AS runtime

WORKDIR /app

COPY package.json .
RUN bun install --production

COPY index.ts .

ENV KILO_PORT=4096
ENV KILO_HOST=127.0.0.1
ENV KILOCODE_SERVICE_PORT=3005

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

CMD ["bun", "run", "index.ts"]
