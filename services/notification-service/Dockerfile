FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY services/notification-service/package.json services/notification-service/
COPY libs/ts-common/package.json libs/ts-common/
COPY libs/events/typescript/music-events/package.json libs/events/typescript/music-events/
COPY libs/api-clients/typescript/ libs/api-clients/typescript/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY libs/ts-common/ libs/ts-common/
COPY libs/events/typescript/music-events/ libs/events/typescript/music-events/
COPY services/notification-service/ services/notification-service/

RUN cd services/notification-service && npx webpack-cli build --node-env=production

RUN cd services/notification-service && pnpm prune --prod

FROM node:22-alpine

WORKDIR /app

COPY --from=build /workspace/services/notification-service/dist/ ./dist/
COPY --from=build /workspace/node_modules/ ./node_modules/

EXPOSE 8087

CMD ["node", "dist/main.js"]
