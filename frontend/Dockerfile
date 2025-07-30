# Step 1: Build React app
FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm install && NODE_OPTIONS="--max-old-space-size=512" npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# 👇 Use custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
