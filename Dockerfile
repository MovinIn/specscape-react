# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so rebuilds are fast when package*.json is unchanged.
COPY package.json package-lock.json ./
RUN npm ci

# VITE_* variables are baked into the bundle at build time.
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_MAPBOX_TOKEN
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:stable-alpine

# The official image runs envsubst on /etc/nginx/templates/*.template at startup.
ENV API_UPSTREAM=http://rest-api-service:8081 \
    API_HOST=rest-api-service \
    API_PATH=/api/ \
    COOKIE_FLAGS=off \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
