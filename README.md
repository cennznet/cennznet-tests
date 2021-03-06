# Cennznet node functional test

## Run test via scripts

### Run all test suites 

__Test on local node__

Please make sure that you have 'cennznet-node' docker image in hand and the name of image must be 'cennznet-node', then run the following command
```bash
yarn test integration_test/run.js
```

__Test on remote node__

For remote tests like Rimu and Kauri, the Staking Test Suite is ignored because new nodes will be started during the test, but remote nodes are out of control.

Command:
```bash
yarn test integration_test/runRemoteTest.js --ws REMOTE_WS_IP
# Replace the REMOTE_WS_IP with the ws ip you want to test.
```

For example, test Rimu:
```bash
yarn test integration_test/runRemoteTest.js --ws wss://cennznet-node-0.centrality.cloud:9944
```

### Run a specified test suite

All test suites are located in **integration_test/testcase**, every one of them could be run lonely.

Command:
```bash
# Test on local node
yarn test integration_test/testcase/TEST_SUITE.js

# Test on remote node
yarn test integration_test/testcase/TEST_SUITE.js --ws REMOTE_WS_IP
```

For example, run GA test suite on Rimu:
```bash
yarn test integration_test/testcase/tc_ga.js --ws wss://cennznet-node-0.centrality.cloud:9944
```

## Run the test via docker

### Build a docker image

Run the following command to build a test image. Do not forget the '.' at the end.
```bash
docker build -f integration_test/Dockerfile -t integration_test .
```

### Run tests

Before test, make sure the 'cennznet-node' docker image is available on your machine. The test script will automatically launch node via that docker image.

__Run all test suites__

Command:
```bash
# Local test
docker run --rm \
  --name ci_test \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  -it integration_test \
  yarn runlocaltest
  
# Remote test
docker run --rm \
  --name ci_test \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /tmp:/tmp \
  -it integration_test \
  yarn runremotetest --ws REMOTE_WS_IP
```

__Run specified test suite__

Command:
```bash
# Local test: node should be launched manually in the first place.
docker run --rm \
  --name ci_test \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -it integration_test \
  yarn test integration_test/testcase/TEST_SUITE.js
  
# Remote test
docker run --rm \
  --name ci_test \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -it integration_test \
  yarn test integration_test/testcase/TEST_SUITE.js --ws REMOTE_WS_IP
```