/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

var crypto = require('crypto');

module.exports.info  = 'ycsb_load';

let bc, contx;
let recordStartIdx;
let firedTxnCount = 0;
let recordCount;

let txnPerBatch;
let orderedinserts;
let fieldCount;
let fieldLength;

/**
 * Generate unique account key for the transaction
 * @returns {Number} account key
 **/
function buildKey(recordIdx) {
    let recordIdxStr = recordIdx.toString();

    let paddingLen = 16 - recordIdxStr.length;
    let key = "user";
    for (let i = 0;i < paddingLen; ++i) {
        key += "0";
    }

    key += recordIdxStr;

    if (orderedinserts) {
        return key;
    } else {
        return crypto.createHash('md5').update(key).digest('hex');
    }
}

function buildValue() {
    let value = '';
    for (let i = 0;i < fieldCount; i++) {
        value += "field" + i.toString() + "=" + random_string(fieldLength) + " ";
    }
    // console.log("fieldCount: ", fieldCount, " fieldLength: ", fieldLength);
    return value;
}

/**
 * Generates random string.
 * @returns {string} random string from possible characters
 **/
function random_string(len) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Generates small bank workload with specified number of accounts
 * and operations.
 * @returns {Object} array of json objects and each denotes
 * one operations
 **/
function generateWorkload() {
    let workload = [];
    for(let i= 0; i < txnPerBatch && firedTxnCount < recordCount; i++, firedTxnCount++) {
        let key = buildKey(recordStartIdx + firedTxnCount);
        // console.log("Inserted Key: " + key);
        let val = buildValue();
        let acc = {
            'key': key,
            'val': val,
            'transaction_type': 'insert'
        };
        workload.push(acc);
    }
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('txnPerBatch')) {
        return Promise.reject(new Error('ycsb.insert - \'txnPerBatch\' is missed in the arguments'));
    }
    txnPerBatch = args.txnPerBatch;

    if(!args.hasOwnProperty('orderedInserts')) {
        orderedinserts = false;
    } else {
        orderedinserts = true;
    }

    if(!args.hasOwnProperty('fieldCount')) {
        return Promise.reject(new Error('ycsb.insert - \'fieldCount\' is missed in the arguments'));
    }
    fieldCount = args.fieldCount;

    if(!args.hasOwnProperty('fieldLength')) {
        return Promise.reject(new Error('ycsb.insert - \'fieldLength\' is missed in the arguments'));
    }
    fieldLength = args.fieldLength;

    recordStartIdx = context.clientIdx * context.op_numb;
    recordCount = context.op_numb;
    bc = blockchain;
    contx = context;
    return Promise.resolve();
};

module.exports.run = function() {
    let args = generateWorkload();
    return bc.invokeSmartContract(contx, contx.contractID, '1.0', args, 30);
};

module.exports.end = function() {
    return Promise.resolve();
};

module.exports.buildKey = buildKey;
module.exports.buildValue = buildValue;