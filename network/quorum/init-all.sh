#!/bin/bash
# <node_count> -p
cd `dirname ${BASH_SOURCE-$0}`
. env.sh

echo "[*] init-all"
mkdir -p $LOG_DIR
mkdir -p ${QUO_DATA}
i=0
for host in `cat $HOSTS`; do
  if [[ $i -lt $1 ]]; then
    echo [*] Configuring node $i on host $host
    ssh -oStrictHostKeyChecking=no  ${ACC_NAME}@$host $QUO_HOME/init.sh $i $1 $2
    echo done node $host
  fi
  let i=$i+1
done

python prepare.py $1 $HOSTS keys/ setup.json $2