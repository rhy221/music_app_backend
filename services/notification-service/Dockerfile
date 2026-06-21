FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm exec nx build notification-service --prod

FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --no-frozen-lockfile

COPY dist/services/notification-service ./dist

EXPOSE 8087
CMD ["node", "dist/main.js"]