FROM node:22-alpine AS build

RUN npm install -g pnpm@11

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY patches/ patches/
COPY services/notification-service/package.json services/notification-service/
COPY libs/ts-common/package.json libs/ts-common/
COPY libs/events/typescript/music-events/package.json libs/events/typescript/music-events/
COPY libs/api-clients/typescript/ libs/api-clients/typescript/

ENV CI=true
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

COPY docker/nx-minimal.json nx.json
COPY tsconfig.base.json ./
COPY libs/ts-common/ libs/ts-common/
COPY libs/events/typescript/music-events/ libs/events/typescript/music-events/
COPY services/notification-service/ services/notification-service/

ENV NX_DAEMON=false
RUN npx nx run notification-service:build --node-env=production

COPY docker/gen-prod-deps.js /tmp/gen-prod-deps.js
RUN mkdir /prod && \
    node /tmp/gen-prod-deps.js services/notification-service/package.json /prod/package.json && \
    cd /prod && npm install --omit=dev --ignore-scripts --legacy-peer-deps

FROM node:22-alpine

WORKDIR /app

COPY --from=build /workspace/services/notification-service/dist/ ./dist/
COPY --from=build /prod/node_modules/ ./node_modules/

EXPOSE 8087

CMD ["node", "dist/main.js"]
