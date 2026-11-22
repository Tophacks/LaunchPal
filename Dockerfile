# LaunchPal vision service, built from the REPO ROOT (for platforms that build the repo root, e.g. Maritime).
# To build from services/vision instead, use services/vision/Dockerfile.
FROM node:22-slim AS build
WORKDIR /app
COPY services/vision/package.json services/vision/package-lock.json ./
RUN npm ci
COPY services/vision/tsconfig.json ./
COPY services/vision/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY services/vision/package.json ./
COPY services/vision/guide ./guide
USER node
# The listening port comes from $PORT (default 8080).
EXPOSE 8080
CMD ["node", "dist/index.js"]
