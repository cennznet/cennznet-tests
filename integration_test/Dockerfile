FROM node:10.15


WORKDIR /integration_test
COPY . /integration_test


RUN apt-get update && \
    apt-get install sudo && \
    apt-get install vim -y && \
    curl -sSL https://get.docker.com/ | sh && \
    npm install

# RUN apt-get update && \
#     apt-get -y install apt-transport-https \
#         ca-certificates \
#         curl \
#         gnupg2 \
#         software-properties-common && \
#     curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg > /tmp/dkey; apt-key add /tmp/dkey && \
#     add-apt-repository \
#     "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
#     $(lsb_release -cs) \
#     stable" && \
#     apt-get update && \
#     apt-get -y install docker-ce

# RUN groupadd -g 999 cennznet && \
#     useradd -r -u 999 -g cennznet cennznet
# USER cennznet


# RUN cd /integration_test/cennznet-node && \
#     ./scripts/build-docker.sh

# ENTRYPOINT [ "npm","test","integration_test/run.js"]