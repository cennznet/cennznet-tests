**Run the test via script**

Please make sure that you have 'cennznet-node' docker image in hand, then run the following command
```bash
npm test integration/run.js
```

**Run the test via docker**

__Build a docker image__
Replace '{Your_Gemfury_token}' with your own token which is available from [https://manage.fury.io/manage/centrality/tokens?kind=api]()
```bash
docker build -f integration_test/Dockerfile -t integration_test --build-arg GEMFURY={Your_Gemfury_token} .
```

__Run the test__
Also need 'cennznet-node' docker image for the following command.
```bash
docker run --rm \
  --name ci_test \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -it integration_test \
  npm test integration_test/run.js
```
