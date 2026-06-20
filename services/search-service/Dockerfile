FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build search-service --prod

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/search-service ./dist
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
EXPOSE 8085
CMD ["node", "dist/main.js"]