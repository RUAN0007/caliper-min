/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

var ds = require('discrete-sampling');
var prob = require('prob.js');


module.exports.info  = 'custom_txn';

let bc, contx;
let accountNum;
let readNum;
let writeNum;
let hotRatio;
let readHotRatio;
let writeHotRatio;
let endorseSleepMS = 0;
let dataAccessIntervalMS = 0;

function getNextAccountUniform(accountNum, pickRatio) {
    var random = Math.random()
    var next_n;
    if (random < pickRatio) {
      next_n = Math.floor((Math.random() * hotRatio * accountNum));
    } else {
      next_n = Math.floor((Math.random() * (1 - hotRatio) + hotRatio) * accountNum);
    }
    return 'acc' + next_n;
  }

function generateWorkload(accountNum, readNum, writeNum) {
    let workload = [];
    let args = [dataAccessIntervalMS];

    args.push("" + readNum);
    for (let i = 0;i < readNum; i++) {
        args.push(getNextAccountUniform(accountNum, readHotRatio))
    }
    args.push("" + writeNum);
    for (let i = 0; i < writeNum; i++) {
        args.push(getNextAccountUniform(accountNum, writeHotRatio))
    }
        
    let op_payload = {
        'key': args,
        'transaction_type': 'readwrite'
    };
    workload.push(op_payload);
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('accountNum')) {
        return Promise.reject(new Error('custom.txn - \'accountNum\' is missed in the arguments'));
    }
    accountNum = args.accountNum;

    if(!args.hasOwnProperty('hotRatio')) {
        return Promise.reject(new Error('custom.txn - \'hotRatio\' is missed in the arguments.'));
    }
    hotRatio = args.hotRatio;

    if(!args.hasOwnProperty('readHotRatio')) {
        return Promise.reject(new Error('custom.txn - \'readHotRatio\' is missed in the arguments.'));
    }
    readHotRatio = args.readHotRatio;

    if(!args.hasOwnProperty('readNum')) {
        return Promise.reject(new Error('custom.txn - \'readNum\' is missed in the arguments.'));
    }
    readNum = args.readNum;
    
    if(!args.hasOwnProperty('writeNum')) {
        return Promise.reject(new Error('custom.txn - \'writeNum\' is missed in the arguments.'));
    }
    writeNum = args.writeNum

    if(!args.hasOwnProperty('writeHotRatio')) {
        return Promise.reject(new Error('custom.txn - \'writeHotRatio\' is missed in the arguments.'));
    }
    writeHotRatio = args.writeHotRatio

    if(args.hasOwnProperty('endorseSleepMS')) {
        endorseSleepMS = args.endorseSleepMS
    }

    if(args.hasOwnProperty('dataAccessIntervalMS')) {
        dataAccessIntervalMS = args.dataAccessIntervalMS
    }
    
    bc       = blockchain;
    contx    = context;
    return Promise.resolve();
};

module.exports.run = function() {
    prob = Math.random();

    let args = generateWorkload(accountNum, readNum, writeNum);
    return bc.invokeSmartContract(contx, contx.contractID, 'v0', args, 30, endorseSleepMS);
};

module.exports.end = function() {
    return Promise.resolve();
};
