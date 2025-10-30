# Stage 1: Build Stage
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Production Stage
FROM nginx:stable-alpine

# Entferne Standard-Nginx-Website
RUN rm -rf /usr/share/nginx/html/*

# Kopiere Build-Ordner aus der vorherigen Stage
COPY --from=build /app/build /usr/share/nginx/html

# Kopiere ggf. eigene Nginx-Konfiguration (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Exponiere Port 80
EXPOSE 80

# Starte Nginx
CMD ["nginx", "-g", "daemon off;"]
