# Fabric
## Step 1: Restart the network
* Follow the README.md in *caliper/network/fabric*

## Step 2: Run benchmark
```
# CMD:
# node main.js -c <workload-json> -n <relative/path/to/fabric/setup.json> 

# Single client
node main.js -c ../benchmark/smallbank/fabric-config.json -n ../network/fabric/cluster/env/3p/setup.json

# Multiple clients for the distributed benchmark
node main.js -c ../benchmark/smallbank/fabric-config-zk.json -n ../network/fabric/cluster/env/3p/setup.json
```
## Step 3: Turn down the network
* Follow the README.md in *caliper/network/fabric*

# To Run with Quorum
## Step 1: Start up the network
* Follow the README.md in *caliper/network/quorum*

## Step 2: Run benchmark
```
# CMD:
# node main.js -c <workload-json> -n <relative/path/to/quorum/setup.json> 

# Single client host
node main.js -c quorum-config.json -n ../../network/quorum/setup.json

# Multiple clients for the distributed benchmark
node main.js -c quorum-config-zk.json -n ../../network/quorum/setup.json
```
## Step 3: Turn down the network. 
* Follow the README.md in *caliper/network/quorum*

# NOTE: Distributed Benchmark with Zookeeper
* Launch the zookeeper cluster
* Correctly update the address of one zookeeper node in *workload-json*
* Before Step 2: Run the following process on each client machine
```
node caliper/src/comm/client/zoo-client.js <one/zk/node/address>

E.g, 
node caliper/src/comm/client/zoo-client.js slave-40:2181
```
