FROM node:6

WORKDIR /usr/src/gdaxbot

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 80 443

CMD [ "npm", "start" ]
