FROM node:10.15.0-stretch-slim

WORKDIR /integration_test
COPY . /integration_test

RUN apt-get update && apt-get upgrade -y && \
    apt-get install vim -y && \
    npm install


ENTRYPOINT [ "npm","test","integration_test/run.js"]