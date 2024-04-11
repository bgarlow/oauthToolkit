FROM node:8
RUN npm install -g @angular/cli@7.0.3
WORKDIR /app
COPY . .
RUN npm install
RUN ng build
EXPOSE 3000
CMD npm start