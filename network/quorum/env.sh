QUO_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )" # Current script directory
HOSTS=$QUO_HOME/hosts # file that contains the address of each host
ACC_NAME=jack # account name for later ssh

QUO_DATA=/tmp/qdata # Path to data directory required by Quorum
LOG_DIR=/tmp/quorum_logs # Path of quorum log file

QUORUM=/bin/qeth # Path to quorum binary
TESSERA_JAR=${QUO_HOME}/tessera-app-0.7.3-app.jar # Optional, Required if turn on the permissioned setting

