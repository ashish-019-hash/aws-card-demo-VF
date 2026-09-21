FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /app
RUN groupadd --system carddemo && useradd --system --gid carddemo --create-home carddemo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER carddemo
EXPOSE 3000
CMD ["node", "dist/main"]
