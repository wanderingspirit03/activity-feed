FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json .npmrc* ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN mkdir -p public
RUN npx next build

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm install tsx ws ioredis

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--import", "tsx/esm", "server.ts"]
