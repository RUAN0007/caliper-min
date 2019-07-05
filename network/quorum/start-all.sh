#!/bin/bash
# <num_nodes> -p
cd `dirname ${BASH_SOURCE-$0}`
. env.sh

echo "start-all.sh"

if [[ $2 == "-p" ]]; then
  i=1
  echo "###Start Tessera"
  for host in `cat $HOSTS`; do
    if [[ $i -le $1 ]]; then
      DDIR="${QUO_DATA}/c$i"
      CMD="java -jar ${TESSERA_JAR} -configfile ${DDIR}/tessera-config${i}.json"
      ssh ${host} "echo ${CMD} > ${LOG_DIR}/tessera$i.log 2>&1 &"
      ssh ${host} "${CMD} >> ${LOG_DIR}/tessera$i.log 2>&1 &"
      let i=$i+1
    fi
  done


  # echo "Waiting until all Tessera nodes are running..."
  # DOWN=true
  # k=10
  # i=1
  # while ${DOWN}; do
  #     sleep 1
  #     DOWN=false
  #     for host in `cat $HOSTS`; do
  #       if [[ $i -le $1 ]]; then
  #         if [ ! -S "qdata/c${i}/tm.ipc" ]; then
  #             echo "Node ${i} is not yet listening on tm.ipc"
  #             DOWN=true
  #         fi

  #         set +e
  #         #NOTE: if using https, change the scheme
  #         #NOTE: if using the IP whitelist, change the host to an allowed host
  #         result=$(curl -s http://${host}/upcheck)
  #         set -e
  #         if [ ! "${result}" == "I'm up!" ]; then
  #             echo "Node ${i} is not yet listening on http"
  #             DOWN=true
  #         fi
  #         let i=$i+1
  #       done
  #     done

  #     k=$((k - 1))
  #     if [ ${k} -le 0 ]; then
  #         echo "Tessera is taking a long time to start.  Look at the Tessera logs in qdata/logs/ for help diagnosing the problem."
  #     fi
  #     echo "Waiting until all Tessera nodes are running..."

  #     sleep 5
  # done
  sleep 5
  echo "All Tessera nodes started"
fi




echo "###Start Miners"
i=0
for host in `cat $HOSTS`; do
  if [[ $i -lt $1 ]]; then
    echo [*] Starting Quorum node $i on host: $host
    ssh -oStrictHostKeyChecking=no ruanpc@$host $QUO_HOME/start-mining.sh $i $1 $2
  fi
  let i=$i+1
done

echo done start-all.sh