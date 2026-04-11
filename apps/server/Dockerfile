FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/game/package.json packages/game/package.json
COPY packages/grid/package.json packages/grid/package.json
COPY packages/noise/package.json packages/noise/package.json
COPY packages/protocol/package.json packages/protocol/package.json

RUN pnpm install --filter @ambotrope/server... --frozen-lockfile

COPY apps/server apps/server
COPY packages/game packages/game
COPY packages/grid packages/grid
COPY packages/noise packages/noise
COPY packages/protocol packages/protocol

RUN chown -R appuser:appgroup /app /pnpm

USER appuser

EXPOSE 3000

CMD ["pnpm", "--filter", "@ambotrope/server", "start"]
