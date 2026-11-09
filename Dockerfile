# The build stage installs every dependency and builds the frontend,
# the final stage keeps only what the server runs.
FROM node:26.13.0-slim AS build
# Node 25+ ships without corepack.
RUN npm install --global pnpm@12.18.0
WORKDIR /app
# Packages are fetched by the lockfile alone, so this layer survives source changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --dir frontend build
RUN pnpm --filter backend deploy --prod /prod/backend

FROM node:26.13.0-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
# The repository layout: the server finds the contract and the frontend build relative to its modules.
COPY --from=build /prod/backend backend
COPY spec/generated/openapi.yaml spec/generated/
COPY --from=build /app/frontend/dist frontend/dist
USER node
EXPOSE 8080
CMD ["node", "backend/src/server.ts"]
