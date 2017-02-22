#!/bin/bash
docker pull mongo
docker pull node
docker run -v "$(pwd)":/data --name mongo -d mongo mongod --smallfiles
#docker exec -it mongo bash
docker run --name node -v "$(pwd)":/data --link mongo:mongo -w /data -p 8082:8082 node npm install &&
docker commit node $USER/trackme-node &&
docker rm node &&
docker run -it --name node -v "$(pwd)":/data --link mongo:mongo -w /data -p 8082:8082 $USER/trackme-node bash --rcfile motd
