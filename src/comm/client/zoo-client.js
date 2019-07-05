/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

const Blockchain = require('../blockchain.js');
const ZooKeeper = require('node-zookeeper-client');
const zkUtil = require('./zoo-util.js');
const clientUtil = require('./client-util.js');
const path = require('path');
const Util = require('../util.js');
const log  = Util.log;

if (process.argv.length < 3) {
    log('Missed zookeeper address');
    process.exit(0);
}

/**
* zookeeper structure
* /caliper---clients---client_xxx   // list of clients
*         |         |--client_yyy
*         |         |--....
*         |--client_xxx_in---msg_xxx {message}
*         |               |--msg_xxx {message}
*         |               |--......
*         |--client_xxx_out---msg_xxx {message}
*         |                |--msg_xxx {message}
*         |--client_yyy_in---...
*/
let zk = ZooKeeper.createClient(process.argv[2]);
let clientID = '', inNode = '', outNode = '';
let closed = false;
let results = [];   // contains testResult message data
let updates = [];   // contains txUpdated message data
let updateTail = 0;
let updateInter = null;
let updateTime = 1000;

/**
 * Remove unused znodes
 * @return {Promise} promise object
 */
function clear() {
    let promises = [];
    if(inNode !== '') {
        promises.push(zkUtil.removeChildrenP(zk, inNode, 'Failed to remove children due to'));
    }
    if(outNode !== '') {
        promises.push(zkUtil.removeChildrenP(zk, outNode, 'Failed to remove children due to'));
    }
    clientUtil.stop();
    return Promise.all(promises);
}

/**
 * Close zk client
 */
function close() {
    if (closed) {
        return;
    }
    closed = true;
    clear().then(()=>{
        let promises = [];
        if(inNode !== '') {
            promises.push(zkUtil.removeP(zk, inNode, -1, 'Failed to remove inNode due to'));
        }
        if(outNode !== '') {
            promises.push(zkUtil.removeP(zk, outNode, -1, 'Failed to remove inNode due to'));
        }
    }).then(()=>{
        log('Node ' + inNode + ' ' + outNode + ' is deleted');
        inNode = '';
        outNode = '';
        zk.close();
    }).catch((err)=>{
        inNode = '';
        outNode = '';
        zk.close();
    });
}

/**
 * Write data (send message) into zk
 * @param {Buffer} data message data
 * @return {Promise} promise object
 */
function write(data) {
    return zkUtil.createP(zk, outNode+'/msg_', data, ZooKeeper.CreateMode.EPHEMERAL_SEQUENTIAL, 'Failed to send message (create node) due to');
}

/**
 * Generate and send txUpdated message
 */
function txUpdate() {
    let len = updates.length;
    if(len === updateTail) {
        return;
    }

    let submitted = 0;
    let committed = [];
    for(let i = updateTail ; i < len ; i++) {
        submitted += updates[i].submitted;
        committed.push(updates[i].committed);
    }
    updateTail = len;

    let message = {type: 'txUpdated', data: {submitted: submitted}};
    if(Blockchain.mergeDefaultTxStats(committed) === 0) {
        message.data.committed = Blockchain.createNullDefaultTxStats();
    }
    else {
        message.data.committed = committed[0];
    }
    let buf = new Buffer(JSON.stringify(message));
    write(buf);
}


/**
 * Initialise global variables before test
 */
function beforeTest() {
    results = [];
    updates = [];
    updateTail = 0;
    updateInter = setInterval(txUpdate, updateTime);
}

/**
 * Send results and release resources after test
 * @return {Promise} promise object
 */
function afterTest() {
    if(updateInter) {
        clearInterval(updateInter);
        updateInter = null;
        txUpdate();
    }

    return Util.sleep(200).then(()=>{
        // let message = {type: 'testResult', data: []};
        // if(Blockchain.mergeDefaultTxStats(results) === 0) {
        //     message = {type: 'testResult', data: Blockchain.createNullDefaultTxStats()};
        // }
        // else {
        //     message = {type: 'testResult', data: results[0]};
        // }

        let query_results = [];
        let invoke_results = [];
        let overall_results = [];
        let detailed_delay_results = [];
        
        results.forEach(function(element) {
            query_results.push(element[0]);
            invoke_results.push(element[1]);
            overall_results.push(element[2]);
            detailed_delay_results.push(element[3]);
        });

        // For query stats
        let query_stats;
        if(Blockchain.mergeDefaultTxStats(query_results) === 0) {
            query_stats = Blockchain.createNullDefaultTxStats();
        } else {
            query_stats = query_results[0];
        }

        // For invoke stats
        let invoke_stats;
        if(Blockchain.mergeDefaultTxStats(invoke_results) === 0) {
            invoke_stats = Blockchain.createNullDefaultTxStats();
        } else {
            invoke_stats = invoke_results[0];
        }

        // For overall stats
        let overall_stats;
        if(Blockchain.mergeDefaultTxStats(overall_results) === 0) {
            overall_stats = Blockchain.createNullDefaultTxStats();
        } else {
            overall_stats = overall_results[0];
        }

        let detailed_delay_stats;
        if (Blockchain.mergeDetailedDelayStats(detailed_delay_results) === 0) {
            detailed_delay_stats = Blockchain.createNullDetailedDelayStats()
        } else {
            detailed_delay_stats = detailed_delay_results[0];
        }

        let message = {type: 'testResult', data: [query_stats, invoke_stats, overall_stats, detailed_delay_stats]};
        let buf = new Buffer(JSON.stringify(message));
        return write(buf);
    }).catch((err) => {
        log(err);
        return Promise.resolve();
    });
}

/**
 * Message handler
 * @param {Object} data message received
 * @return {Promise} returned bool value which indicates whether the zk connection has been closed or not
 */
function zooMessageCallback(data) {
    let msg  = JSON.parse(data.toString());
    log('Receive message, type='+msg.type);

    switch(msg.type) {
    case 'test': {
        beforeTest();
        zkUtil.removeChildrenP(zk, outNode, 'Failed to remove children in outNode due to').then(()=>{
            return clientUtil.startTest(msg.clients, msg, msg.clientargs, updates, results);
        }).then(() => {
            return afterTest();
        }).catch((err)=>{
            log('==Exception while testing, ' + err);
            return afterTest();
        });
        break;
    }
    case 'quit': {
        clear();
        break;
    }
    default: {
        clientUtil.sendMessage(msg);
        break;
    }
    }
    return Promise.resolve(closed);
}

/**
 * Waiting for messages by watching corresponding zk nodes
 * @return {Promise} promise object
 */
function watch() {
    return zkUtil.watchMsgQueueP(
        zk,
        inNode,
        (data) => {
            return zooMessageCallback(data).catch((err) => {
                log('Exception encountered when watching message from zookeeper, due to:');
                log(err);
                return Promise.resolve(true);
            });
        },
        'Failed to watch children nodes in zookeeper'
    ).catch((err) => {
        log(err);
        return Promise.resolve();
    });
}

/**
 * Callback when connecting to zk
 */
zk.once('connected', function() {
    log('Connected to ZooKeeper');
    zkUtil.existsP(zk, zkUtil.NODE_ROOT, 'Failed to find NODE_ROOT due to').then((found)=>{
        if(found) {
            return Promise.resolve();
        }
        else {
            return zkUtil.createP(zk, zkUtil.NODE_ROOT, null, ZooKeeper.CreateMode.PERSISTENT, 'Failed to create NODE_ROOT due to');
        }
    }).then(()=>{
        return zkUtil.existsP(zk, zkUtil.NODE_CLIENT, 'Failed to find clients node due to');
    }).then((found)=>{
        if(found) {
            return Promise.resolve();
        }
        else {
            return zkUtil.createP(zk, zkUtil.NODE_CLIENT, null, ZooKeeper.CreateMode.PERSISTENT, 'Failed to create clients node due to');
        }
    }).then(()=>{         // create client node
        let random = new Date().getTime();
        let clientPath = zkUtil.NODE_CLIENT + '/client_'+random+'_';
        return zkUtil.createP(zk, clientPath, null, ZooKeeper.CreateMode.EPHEMERAL_SEQUENTIAL, 'Failed to create client node due to');
    }).then((clientPath)=>{
        log('Created client node:'+clientPath);
        clientID = path.basename(clientPath);
        inNode   = zkUtil.getInNode(clientID);
        outNode  = zkUtil.getOutNode(clientID);
        return zkUtil.createP(zk, inNode, null, ZooKeeper.CreateMode.PERSISTENT, 'Failed to create receiving queue due to');
    }).then((inPath)=>{
        log('Created receiving queue at:'+inPath);
        return zkUtil.createP(zk, outNode, null, ZooKeeper.CreateMode.PERSISTENT, 'Failed to create sending queue due to');
    }).then((outPath)=>{
        log('Created sending queue at:'+outPath);
        log('Waiting for messages at:'+inNode+'......');
        watch();
    }).catch((err)=> {
        log(err.stack ? err.stack : err);
        close();
    });
});

process.on('SIGINT', () => { close(); });

zk.connect();

