FROM node:10.15


WORKDIR /integration_test
COPY . /integration_test

RUN apt-get update && \
    apt-get install sudo && \
    apt-get install vim -y && \
    curl -sSL https://get.docker.com/ | sh && \
    npm install

RUN groupadd -g 999 cennznet && \
    useradd -r -u 999 -g cennznet cennznet
USER cennznet

RUN cd /integration_test/cennznet-node && \
    ./scripts/build-docker.sh

ENTRYPOINT [ "npm","test","integration_test/run.js"]