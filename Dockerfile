# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_STORAGE=local
ARG VITE_API_URL=""

COPY package*.json ./
RUN npm ci

COPY . .
RUN VITE_STORAGE=$VITE_STORAGE VITE_API_URL=$VITE_API_URL npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
