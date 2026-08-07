# Stage 1: build the Angular app (needs Node, only used during build)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json .
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Stage 2: serve the built files (only needs nginx, nothing else from stage 1 survives)
FROM nginx:1.27-alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
