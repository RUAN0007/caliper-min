#!/bin/bash
#arg num_nodes
cd `dirname ${BASH_SOURCE-$0}`
. env.sh

echo "[*] Running stop-all.sh"
i=0
for host in `cat $HOSTS`; do
  if [[ $i -lt $1 ]]; then
    ssh -oStrictHostKeyChecking=no ${ACC_NAME}@$host $QUO_HOME/stop.sh
    echo done node $host
  fi
  let i=$i+1
done

# echo "[**] Cleaning up temporary data directories"
rm -rf $QUO_DATA
rm -rf setup.json
# rm -rf ~/.eth*
