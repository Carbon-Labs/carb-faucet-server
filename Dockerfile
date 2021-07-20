FROM node:12
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY ./package*.json ./
RUN rm -rf node_modules
RUN npm install
COPY . ./home/node/app
EXPOSE 3000