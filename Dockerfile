FROM node:12
WORKDIR /home/node/app
COPY package*.json ./
RUN npm cache clean --force && npm install
COPY . .
EXPOSE 3000