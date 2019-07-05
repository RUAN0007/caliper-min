#!/bin/bash
# <node_num> -p
cd `dirname ${BASH_SOURCE-$0}`
. env.sh
echo "[*] start-mining.sh <node_num> <node_count> [-p]"

let i=$1+1
node_count=$2
key_count=33
key_per_node=$((key_count/node_count))
unlock_opt=$(python -c "import sys; print ','.join([str(i) for i in range(int(sys.argv[1]))])" $key_per_node)

# CHECKPOINT="--emitcheckpoints"
if [[ $3 == "-p" ]]; then
    PRIVATE_CONFIG=${QUO_DATA}/c${i}/tm.ipc nohup ${QUORUM} --datadir $QUO_DATA/dd$i  --nodiscover --verbosity 5 --networkid 17 --raft --rpc --rpcaddr 0.0.0.0 --rpcapi admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,raft ${CHECKPOINT} --permissioned --raftport 50200 --rpcport 8000 --port 9000 --unlock "${unlock_opt}" --password <(echo -n "") > $LOG_DIR/logs 2>&1 & echo "[*] Permissioned miner started"
 else
  PRIVATE_CONFIG=ignore nohup ${QUORUM} --datadir $QUO_DATA/dd$i  --nodiscover --verbosity 5 --networkid 17 --raft --rpc --rpcaddr 0.0.0.0 --rpcapi admin,db,eth,debug,miner,net,shh,txpool,personal,web3,quorum,raft ${CHECKPOINT} --permissioned --raftport 50200 --rpcport 8000 --port 9000 --unlock "${unlock_opt}" --password <(echo -n "") > $LOG_DIR/logs 2>&1 &
  echo "[*] miner started"
fi
#echo --datadir $QUO_DATA --rpc --rpcaddr 0.0.0.0 --rpcport 8000 --port 9000 --raft --raftport 50200 --raftblocktime 2000 --unlock 0 --password <(echo -n "") 
sleep 1

#for com in `cat $QUO_HOME/addPeer.txt`; do
 #    geth --exec "eth.blockNumber" attach $QUO_DATA/geth.ipc
     #geth  attach ipc:/$ETH_DATA/geth.ipc

#done