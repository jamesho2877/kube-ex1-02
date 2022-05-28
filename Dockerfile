FROM node:18.2.0-alpine

WORKDIR /usr/src/app

COPY package* ./

RUN npm install

COPY . .

CMD ["npm", "start"]