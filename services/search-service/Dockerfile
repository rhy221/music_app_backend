FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build search-service --prod

FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --no-frozen-lockfile

COPY services/search-service/dist ./dist

EXPOSE 8082
CMD ["node", "dist/main.js"]