FROM node:10.15.1-stretch-slim

WORKDIR /integration_test
COPY . /integration_test

RUN apt-get update && \
    apt-get install sudo && \
    apt-get install vim -y && \
    curl -sSL https://get.docker.com/ | sh && \
    npm config set registry https://registry.npmjs.org/ && \
    npm install

# ENTRYPOINT [ "npm","test","integration_test/run.js"]
ENTRYPOINT [ "" ]