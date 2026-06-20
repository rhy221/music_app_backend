FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY services/search-service/package.json services/search-service/
COPY libs/ts-common/package.json libs/ts-common/
COPY libs/events/typescript/music-events/package.json libs/events/typescript/music-events/
COPY libs/api-clients/typescript/ libs/api-clients/typescript/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY libs/ts-common/ libs/ts-common/
COPY libs/events/typescript/music-events/ libs/events/typescript/music-events/
COPY services/search-service/ services/search-service/

RUN cd services/search-service && npx webpack-cli build --node-env=production

RUN cd services/search-service && pnpm prune --prod

FROM node:22-alpine

WORKDIR /app

COPY --from=build /workspace/services/search-service/dist/ ./dist/
COPY --from=build /workspace/node_modules/ ./node_modules/

EXPOSE 8085

CMD ["node", "dist/main.js"]
