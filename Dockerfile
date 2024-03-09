FROM --platform=arm64 node:14 as node
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN ng build --prod
FROM nginx:alpine
COPY --from=build /app/dist/your-angular-app /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]