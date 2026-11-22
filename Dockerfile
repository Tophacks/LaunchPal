# LaunchPal vision HTTP service deployed by Maritime from the repository root.
# The separate services/vision/Dockerfile is for building with that directory as context.
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
# The application binds 0.0.0.0:$PORT supplied by Maritime (fallback: 8080).
EXPOSE 8080
CMD ["node", "dist/index.js"]
