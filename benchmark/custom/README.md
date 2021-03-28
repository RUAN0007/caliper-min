# Overview
This guide demonstrates how to reproduce experiments in SIGMOD 20 paper [A Transactional Perspective on Execute-order-validate Blockchains](https://dl.acm.org/doi/pdf/10.1145/3318464.3389693?casa_token=mDXF6kWKwNwAAAAA:4bbkxngYNKRuJbjvHGmFT1RcYzwbAJsOKJ_5t0MINsrKTIDPFdqYDjURsY1cbWYV3QkhRBhZvPqyxVw).
We assume a single-peer and single-orderer network in docker, as provided [here](../../network/fabric/simple-docker). 
# Preparation
## Install NodeJS and NPM
The below shows my own versions. 
```
$ npm -v
5.6.0

$ node -v
v8.11.3
```

## Download Npm Packages
```
# under caliper-min/
npm install
```
## Build Fabric peer and orderer docker
* Clone FabricSharp [sigmod20](https://github.com/ooibc88/FabricSharp/tree/sigmod20) branch.
* Build docker images for Fabric orderer and peer. 

Make sure images are tagged with
`hyperledger/fabric-orderer:latest` and  `hyperledger/fabric-peer:latest`.

## Pull ccenv docker image

```
docker pull hyperledger/fabric-ccenv:1.3.0
docker tag hyperledger/fabric-ccenv:1.3.0 hyperledger/fabric-ccenv:latest
```

Run `docker images` command and you should have the following outputs:

```
REPOSITORY                     TAG                              IMAGE ID            CREATED             SIZE
hyperledger/fabric-orderer     amd64-1.3.1-snapshot-fc639da4c   bca1d14179af        23 minutes ago      145MB
hyperledger/fabric-orderer     amd64-latest                     bca1d14179af        23 minutes ago      145MB
hyperledger/fabric-orderer     latest                           bca1d14179af        23 minutes ago      145MB
hyperledger/fabric-peer        amd64-1.3.1-snapshot-fc639da4c   56305ddd6419        24 minutes ago      151MB
hyperledger/fabric-peer        amd64-latest                     56305ddd6419        24 minutes ago      151MB
hyperledger/fabric-peer        latest                           56305ddd6419        24 minutes ago      151MB
hyperledger/fabric-ccenv       1.3.0                            953124d80237        2 years ago         1.38GB
hyperledger/fabric-ccenv       latest                           953124d80237        2 years ago         1.38GB
hyperledger/fabric-baseimage   amd64-0.4.13                     27240288889f        2 years ago         1.34GB
hyperledger/fabric-baseos      amd64-0.4.13                     f0fe49196c40        2 years ago         124MB
```

# Run Experiment

```
workload_type="intro" # For Fig 1 in Sec 1 Intro
workload_file="empty.json" # For the first-bar No-op
cc_type="sharp" # // can also be latest, standard

# Assume under caliper-min/benchmark/custom. 
./exp.sh workload/"${workload_type}/${workload_file}" "${cc_type}"
```

## Other Workloads for Figures
```
workload_type="write_hot_ratio" # Fig 11
workload_type="read_hot_ratio" # Fig 12
workload_type="client_delay" # Fig 13
workload_type="access_interval" # Fig 14
```

For Fig 10, you need to manually configure `$BLOCK_SIZE` in [env.sh](env.sh).

## Inspect Logs during Experiments
```
# Assume under caliper-min/
less +F network/fabric/simple-docker/log/orderer.log
less +F network/fabric/simple-docker/log/peer.log
```

## Check Results after Experiments
For each experimental run, `RESULT_DIR=caliper-min/benchmark/custom/result/$(date)/${cc_type}/${workload_type}/${workload_name}` directory would hold the original workload files and measurements, as detailed below: 
* A concise benchmark report in `${RESULT_DIR}/result.json` 
* The original worload file in `${RESULT_DIR}/workload.json`
* The caliper stdout in `${RESULT_DIR}/stdout`
* The caliper stderr in `${RESULT_DIR}/stderr`
* Internal fine-grained measurements on the orderer process in `${RESULT_DIR}/orderer.stat`, if any. 
* Internal fine-grained measurements on the peer process in `${RESULT_DIR}/peer.stat`, if any. 

# Issues
## The Overload of Aborted Txns
Too many timeout of aborted txns may overload the Caliper's nodejs event scheduler, so that some timeout events may fail to trigger. As a consequence, the console would repeatedly show logs as below. 


```
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
[Transaction Info] - Submitted: 41973 Succ: 25733 Fail:14898 Unfinished:1342 ( submited: 0 commited: 0 succ: 0 failed: 0)
```

If it occurs, wait for additional 2 min and check whether the repeated logs would be halted automically. If not, interrupt the client process by 'Ctrl-C'. 

Then in the next run, try to lower down the request rate and decrease the workload skewness. These are to reduce the abort rate. In my own experiments, this issue is addressed by the distributed benchmarking with multiple client hosts, so that the workload is spread out. 

## Failed to instantiate chaincodes

Check logs of peer in `caliper-min/network/fabric/simple-docker/log/peer.log`. If there's an error says `Failed to generate platform-specific docker build: Failed to pull hyperledger/fabric-ccenv:latest: API error (404): manifest for hyperledger/fabric-ccenv:latest not found: manifest unknown: manifest unknown`, you probably lack necessary docker image. 

See `Preparation -> Pull ccenv docker image ` to solve it.