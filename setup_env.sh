#!/bin/bash
docker pull mongo
docker pull nginx
docker pull node
#docker build -f node.Dockerfile -t $USER/trackme-node .  
docker network create  track-me-network
docker run --name node -v "$(pwd)":/data -w /data node npm install &&
docker commit node $USER/trackme-node &&
docker rm node &&
docker run -v "$(pwd)":/data --name mongo -d --net=track-me-network mongo mongod --smallfiles &&
sleep 1 &&
docker run -d --name node -v "$(pwd)":/data -w /data --net=track-me-network $USER/trackme-node node app.js &&
sleep 1 &&
docker run -d --name nginx -v "$(pwd)/nginx.conf":/etc/nginx/nginx.conf -p 8081:80 --net=track-me-network nginx
