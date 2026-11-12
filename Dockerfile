# Pilotask web app. deploy.sh builds the "builder" stage and publishes /app/dist
# into the web root served by the stack's nginx; the last stage is only for a
# local preview (frontend/docker-compose.yml).
FROM node:22-alpine AS builder

WORKDIR /app

# pnpm pinned: pnpm 12 rejects dependency build scripts that are not decided in
# pnpm-workspace.yaml (ERR_PNPM_IGNORED_BUILDS), so "latest" can break a build.
RUN corepack enable && corepack prepare pnpm@12.14.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Same origin by default: nginx sends /api to Laravel.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
# Browser push (Firebase web app). Empty: in-app notifications only.
ARG VITE_FIREBASE_API_KEY=
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN=
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID=
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_SENDER_ID=
ENV VITE_FIREBASE_SENDER_ID=$VITE_FIREBASE_SENDER_ID
ARG VITE_FIREBASE_APP_ID=
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_VAPID_KEY=
ENV VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

COPY . .
RUN pnpm run build

# ─── Local preview ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
