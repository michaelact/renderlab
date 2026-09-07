# ---- Build ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Serve ----
# dist/index.html is a single self-contained file (CSS/JS/fonts all inlined),
# so nginx's default config already serves it correctly with no extra setup.
FROM nginx:alpine
COPY --from=build /app/dist/index.html /usr/share/nginx/html/index.html
EXPOSE 80
