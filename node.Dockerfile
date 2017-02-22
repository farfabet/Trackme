FROM node

WORKDIR /tmp/
COPY package.json /tmp/
RUN npm install

