FROM node:12
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY package.json /home/node/app/
RUN npm install && npm run build
COPY . /home/node/app
EXPOSE 3000