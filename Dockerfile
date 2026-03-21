# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=base /app/dist ./dist
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000
CMD ["node", "dist/main"]
