FROM node:18

RUN mkdir -p /var/www/api

WORKDIR /var/www/api

COPY . .

RUN npm install

RUN npm run build

EXPOSE 8008

CMD [ "node", "dist/main.js" ]