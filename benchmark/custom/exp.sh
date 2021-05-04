#!/bin/bash

# 1>filename # Redirect stdout to file "filename."
# 1>>filename # Redirect and append stdout to file "filename."
# 2>filename # Redirect stderr to file "filename."
# 2>>filename # Redirect and append stderr to file "filename."
# 2>&1 # Redirects stderr to stdout.
# >>filename 2>&1 # Error messages get sent to same place as standard output.
# timeout --foreground 60m "$cmd" | tee "$logFile" # Run a cmd with 60 min to timout. Show in console and Redirect the stdout to write to $logFile. Preserve status code of $cmd to $?. --foreground to allow for interrupt

# "$cmd" > >(tee stdout.log) 2> >(tee stderr.log >&2) Show in console both stdout and stderr while directing them to direct log files.

# set -e # exit when a cmd fails
set -u # exit when using undeclared env var
set -o pipefail # Save exit code after pipelining to tee
# set -x # trace what gets executed

# Double brackets for testing condition without the need for double quotes for the interpolated variable
if [[ $# == 0 ]]; then
    echo "Illegal number of parameters"
    echo "exp.sh <workload_file> <cc_type>"
    exit 1
fi

prevDir=$(pwd)

# Double quotes around every parameter expansion "$var"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

. env.sh  # for any environment variable

trap ctrl_c INT
function ctrl_c() {
  echo "** Trapped CTRL-C. Revert back to calling directory $prevDir"
  cd "$prevDir"
}

date=$(date +"%d-%m")
function main() {

    workloadPath=$1
    ccType=$2

    workloadType=$(basename $(dirname $workloadPath));
    workloadName=$(basename $workloadPath .json) # Strip the .json suffix and the proceding directory 
    expResultDir="${RESULT_DIR}/${date}/${ccType}/${workloadType}/${workloadName}"
    mkdir -p "$expResultDir"

    caliperStdoutPath="$expResultDir/stdout"
    caliperStdErrPath="$expResultDir/stderr"
    resultPath="${expResultDir}/result.json"
    ordererStatPath="${expResultDir}/orderer.stat"
    peerStatPath="${expResultDir}/peer.stat"
    cp "${workloadPath}" "${expResultDir}/workload.json" # Copy the original workload config

    echo "======================================================================"
    echo "Start experiment on Fabric ${ccType^^} for workload ${workloadType}/${workloadName}"

    echo "----------Launch Fabric------------"
    CC_TYPE=${ccType} TXN_SPAN_LIMIT=10 BLOCK_SIZE=${BLOCK_SIZE} docker-compose -f ${DOCKER_COMPOSE_PATH} up -d;

    echo "----------Run the benchmark------------"
    timeout --foreground 2m node ../../src/main.js -c "${workloadPath}" -n "${NETWORK_SETUP_PATH}" -r "$resultPath" > >(tee "${caliperStdoutPath}") 2> >(tee "${caliperStdErrPath}" >&2);

    echo "--------- Shut down Fabric-------------"
    docker-compose -f "${DOCKER_COMPOSE_PATH}" down;

    ordererScript="fabric_log_script/process_occ-${ccType}_orderer.py"
    peerScript="fabric_log_script/process_occ-${ccType}_peer.py"

    echo "----------Process the logs for more measurements------------"
    if [[ -f "$ordererScript" ]]; then
        python "${ordererScript}" "${ORDERER_LOG_PATH}" > "$ordererStatPath"
        echo "    Dump orderer measurements  to ${ordererStatPath}"
    fi

    if [[ -f $peerScript ]]; then
        python "${peerScript}" "${PEER_LOG_PATH}" > "${peerStatPath}"
        echo "    Dump peer measurements to ${peerStatPath}"
    fi

    echo "Finish experiment on Fabric ${ccType^^} for workload ${workloadType}/${workloadName}" 
    echo "======================================================================"

    return 0
}


main "$@"
status="$?"

cd "$prevDir"  # Revert back to the calling directory
exit "$status"