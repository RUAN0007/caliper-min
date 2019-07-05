#!/bin/bash
cd `dirname ${BASH_SOURCE-$0}`
. env.sh

echo "stop.sh" 
killall -KILL qeth
killall -KILL java # To tessera jar
rm -rf $QUO_DATA
rm -rf ~/.eth*