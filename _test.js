
const shell = require('shelljs');

shell.exec(`docker run --rm -d --name integration_test_node  --link ci_test  \
                -v /tmp/node_data:/tmp/node_data \
                -p 9945:9945 -p 9944:9944 -p 30333:30333 -p 30334:30334 \
                cennznet-node --dev --base-path /tmp/node_data/alice \
                --node-key 0000000000000000000000000000000000000000000000000000000000000001 \
                --bootnodes /ip4/127.0.0.1/tcp/30334/p2p/QmXiB3jqqn2rpiKU7k1h7NJYeBg8WNSx9DiTRKz9ti2KSK \
                --port 30333 \
                --key Alice \
                --name ALICE \
                --validator \
                --ws-external \
                --ws-port 9944`,
                { silent: true },
                { async: false},
                function (code, stdout, stderr) {
                    // console.log('Shell CMD exit code:', code);
                    // console.log('Shell CMD output:', stdout);
                    // console.log('Shell CMD stderr:', stderr);
                });