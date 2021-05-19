# End-to-end instruction on the Fabric benchmarking
## Overview
The directory caliper/network/fabric/cluster/env/3p collects all the necessary materials 
to spin up a fabric cluster with 3 peers node (each with different organization), 2 orderer nodes and 1 kafka node. 

In this sample setup, the addresses of 3 peer nodes are *slave-3*, *slave-4* and *slave-5*.
Two orderer node addresses are *slave-30* and *slave-31*.
The only kafka node address is *slave-40*. 

We disable CA and TLS communication. 

## Step 0: Configure and Prepare
Once finishing preparing your own materials, use your own setup info to correctly update the *caliper/network/fabric/cluster/env/3p/setup.json*. (Currently, it is with my own setup info).

Record down the path to this *setup.json*.
This will be used later for the benchmark.

## Step 1: Spin up the fabric network
* Pls help yourself
* We have tested on Fabric v1.3

## Step 2: Benchmark
* Go to corresponding workload directory (e.g, /caliper/benchmark/smallbank) and follow the README.md there
* Need the above-mentioned path for *setup.json*
* Make sure that all the Docker images and containers where chaincode is built are removed so that the change to chaincode will be reflected on the benchmark

## Step 3: Turn down the network
* Pls help yourself
