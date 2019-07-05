/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

module.exports.info  = 'smallbank_load';

let bc, contx;
let account_array = [];
let txnPerBatch;
const initial_balance = 1000000;
let prefix;

/**
 * Generate unique account key for the transaction
 * @returns {Number} account key
 **/
function generateAccount() {
    // should be [a-z]{1,9}
    if(typeof prefix === 'undefined') {
        prefix = process.pid;
    }
    let count = account_array.length+1;
    let num = prefix.toString() + count.toString();
    // return parseInt(num);
    return num;
}

/**
 * Generates random string.
 * @returns {string} random string from possible characters
 **/
function random_string() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    for (let i = 0; i < 12; i++) {
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
    for(let i= 0; i < txnPerBatch; i++) {
        let acc_id = generateAccount();
        account_array.push(acc_id);
        let acc = {
            'customer_id': acc_id,
            'customer_name': random_string(),
            'initial_checking_balance': initial_balance,
            'initial_savings_balance': initial_balance,
            'transaction_type': 'create_account'
        };
        workload.push(acc);
    }
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('txnPerBatch')) {
        return Promise.reject(new Error('smallbank.load - \'txnPerBatch\' is missed in the arguments'));
    }
    txnPerBatch = args.txnPerBatch;
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


module.exports.account_array = account_array;
