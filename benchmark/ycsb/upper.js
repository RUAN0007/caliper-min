/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

var prob = require('prob.js');


module.exports.info  = 'ycsb_upper';

let bc, contx;
let txnPerBatch;

let recordCount;
let upperCount;
let distribution;

let buildKey;

let uniform_sampler;
let zipf_sampler;
let fieldCount=1;
let fieldLength;

function random_string(len) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function buildValue() {
    let value = '';
    for (let i = 0;i < fieldCount; i++) {
        value += "field" + i.toString() + "=" + random_string(fieldLength) + " ";
    }
    console.log("fieldCount: ", fieldCount, " fieldLength: ", fieldLength);
    return value;
}

function nextKey() {
    let key = 0; 
    if (distribution === "uniform") {
       key = Math.floor(uniform_sampler())
    } else if (distribution === "zipf") {
       key = Math.floor(zipf_sampler() - 1);
    } else {
       throw new Error('No Other distribution allowed. ');          
    }
    return buildKey(key);
 }

function generateWorkload() {
    let workload = [];
    let op = "upper";
    for(let j= 0; j<txnPerBatch; j++) {
        let op_payload = {'transaction_type': op, 'upper_count': upperCount, 'keys': []};
        for (let i=1; i <= upperCount;i++) {
            op_payload.keys.push(nextKey());
        }
        for (let i=1; i <= upperCount;i++) {
            op_payload.keys.push(buildValue());
        }
        workload.push(op_payload);
    }
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('txnPerBatch')) {
        return Promise.reject(new Error('ycsb.upper - \'txnPerBatch\' is missed in the arguments'));
    }
    txnPerBatch = args.txnPerBatch;

    if(!args.hasOwnProperty('recordCount')){
        return Promise.reject(new Error('ycsb.upper - \'recordCount\' is missed in the arguments.'));
    }
    recordCount = args.recordCount;

    if(!args.hasOwnProperty('distribution')) {
        return Promise.reject(new Error('ycsb.upper - \'distribution\' is missed in the arguments.'));
    }
    distribution = args.distribution;

    if(!args.hasOwnProperty('upperCount')) {
        return Promise.reject(new Error('ycsb.upper - \'upperCount\' is missed in the arguments.'));
    }
    upperCount = args.upperCount;

    if(!args.hasOwnProperty('fieldLength')) {
        return Promise.reject(new Error('ycsb.upper - \'fieldLength\' is missed in the arguments.'));
    }
    fieldLength = args.fieldLength;

    if (distribution === "zipf") {
        if(!args.hasOwnProperty('zipf_s')) {
            return Promise.reject(new Error('ycsb.upper - \'zipf_s\' is missed in the arguments.'));
        } else {
            zipf_sampler= prob.zipf(args.zipf_s, recordCount);
        }
    } else if (distribution === "uniform") {
      uniform_sampler = prob.uniform(0, recordCount);
    } else {
      throw new Error('No other distribution allowed. ');          
    }

    let insert = require('./insert.js');
    buildKey = insert.buildKey;
    // buildValue = insert.buildValue;

    bc       = blockchain;
    contx    = context;
    return Promise.resolve();
};

module.exports.run = function() {
    let args = generateWorkload();
    return bc.invokeSmartContract(contx, contx.contractID, 'v0', args, 30);
};

module.exports.end = function() {
    return Promise.resolve();
};
