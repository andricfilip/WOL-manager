# Stage 1: Build Angular app
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

# Stage 2: Serve with nginx
FROM nginx:alpine

# Build arg selects backend target:
#   - docker-compose.angular.yml (Linux prod): host.docker.internal  (network_mode: host)
#   - docker-compose.local.yml   (Windows dev): wol_backend_local     (bridge network)
ARG BACKEND_HOST=host.docker.internal

# Process nginx template - only substitute ${BACKEND_HOST}, leave nginx $vars untouched
COPY nginx.conf.template /tmp/nginx.conf.template
RUN envsubst '${BACKEND_HOST}' < /tmp/nginx.conf.template > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/angular-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

