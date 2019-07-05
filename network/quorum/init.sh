#!/bin/bash
#args: node_num node_count is_permission
cd `dirname ${BASH_SOURCE-$0}`
. env.sh

let i=$1+1

echo "[*] init.sh"
mkdir -p $LOG_DIR
mkdir -p $QUO_DATA/dd$i/{keystore,geth}

node_num=$1
key_count=33
node_count=$2
key_per_node=$((key_count/node_count))
start_idx=$((node_num*key_per_node))
end_idx=$(((node_num+1)*key_per_node-1))

for ((k=start_idx+1;k<=end_idx+1;k++)); do
    cp keys/key${k} $QUO_DATA/dd$i/keystore
done 

cp raft/static-nodes$2.json $QUO_DATA/dd$i/static-nodes.json
cp raft/static-nodes$2.json $QUO_DATA/dd$i/permissioned-nodes.json
cp raft/nodekey$i $QUO_DATA/dd$i/geth/nodekey
${QUORUM} --datadir=$QUO_DATA/dd$i init $QUO_HOME/genesis_quorum.json

if [[ $3 == "-p" ]]; then
   DDIR=$QUO_DATA/c$i
   mkdir -p ${DDIR}
   echo "Preparing keys for teressara..."
   cp "keys/tm${i}.pub" "${DDIR}/tm.pub"
   cp "keys/tm${i}.key" "${DDIR}/tm.key"
   rm -f "${DDIR}/tm.ipc"

   host=$(sed -n ${i}p $HOSTS)
   echo "Host: ${host}"
   cat <<EOF > ${DDIR}/tessera-config${i}.json
{
    "useWhiteList": false,
    "jdbc": {
        "username": "sa",
        "password": "",
        "url": "jdbc:h2:${DDIR}/db${i};MODE=Oracle;TRACE_LEVEL_SYSTEM_OUT=0"
    },
    "server": {
        "port": 8080,
        "hostName": "http://${host}",
        "sslConfig": {
            "tls": "OFF",
            "generateKeyStoreIfNotExisted": true,
            "serverKeyStore": "${DDIR}/server${i}-keystore",
            "serverKeyStorePassword": "quorum",
            "serverTrustStore": "${DDIR}/server-truststore",
            "serverTrustStorePassword": "quorum",
            "serverTrustMode": "TOFU",
            "knownClientsFile": "${DDIR}/knownClients",
            "clientKeyStore": "${DDIR}/client${i}-keystore",
            "clientKeyStorePassword": "quorum",
            "clientTrustStore": "${DDIR}/client-truststore",
            "clientTrustStorePassword": "quorum",
            "clientTrustMode": "TOFU",
            "knownServersFile": "${DDIR}/knownServers"
        }
    },
    "peer": [
EOF

let j=$2-1
for host in `head --lines=$j $HOSTS`; do
  echo "       {\"url\": \"http://${host}:8080\" }," >> ${DDIR}/tessera-config${i}.json;
done
last=$(sed -n ${2}p $HOSTS) #Read the ${2} line
echo "       {\"url\": \"http://${last}:8080\" }" >> ${DDIR}/tessera-config${i}.json;
        

cat <<EOF >> ${DDIR}/tessera-config${i}.json
    ],
    "keys": {
        "passwords": [],
        "keyData": [
            {
                "privateKeyPath": "${DDIR}/tm.key",
                "publicKeyPath": "${DDIR}/tm.pub"
            }
        ]
    },
    "alwaysSendTo": [],
    "unixSocketFile": "${DDIR}/tm.ipc"
}
EOF
fi