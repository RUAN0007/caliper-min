# End-to-end instruction on the Quorum benchmarking
## NOTE
* All the files and directories in this folder must be visible to all machines, which intends to run quorum
* Currently only support RAFT consensus
* You can strongly advise to go through the scripts before running, as the script is not so complex. 

## Step 0: Configure
* Update relevant paths and setting in *env.sh* and *hosts*

## Step 1: Prepare the materials
```
# ./init-all.sh <node-count> [-p]

# E.g, to prepare for a cluster of 5 nodes with permissioned setting
./init-all.sh 5 -p

# E.g, to prepare for a cluster of 3 nodes with NO permissioned setting
./init-all.sh 5
```

## Step 2: Spin up the quorum cluster from fresh
```
# ./start-all.sh <node-count> [-p]

# E.g, to spin up a cluster of 5 nodes with permissioned setting
./start-all.sh 5 -p

# E.g, to spin up a cluster of 3 nodes with NO permissioned setting
./start-all.sh 3
```
* NOTE: a json file *setup.json* will be automatically createdn this directory. Note down its path which will be used for benchmark. 

## Step 3: Benchmark
* Go to corresponding workload directory (e.g, /caliper/benchmark/smallbank) and follow the README.md there
* Need the above-mentioned path for *setup.json*

## Step 4: Turn down the network
```
# ./stop-all <node-count>
``` 
* This script will also remove all the generated materials in Step 0. 
