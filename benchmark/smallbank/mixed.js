/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

module.exports.info  = 'smallbank_mixed';

let bc, contx;
let account_array = [];
let queryRatio, txnPerBatch;
const operation_type = ['transact_savings','deposit_checking','send_payment','write_check', 'amalgamate'];
let prefix;

/**
 * Get account index
 * @return {Number} index
 */
function getAccount() {
    return Math.floor(Math.random()*Math.floor(account_array.length));
}

/**
 * Get two accounts
 * @return {Array} index of two accounts
 */
function get2Accounts() {
    let idx1 = getAccount();
    let idx2 = getAccount();
    if(idx2 === idx1) {
        idx2 = getAccount();
    }
    return [idx1, idx2];
}


/**
 * Generates small bank workload with specified number of accounts
 * and operations.
 * @returns {Object} array of json objects and each denotes
 * one operations
 **/
function generateWorkload() {
    let workload = [];
    for(let j= 0; j<txnPerBatch; j++) {
        let op_index =  Math.floor(Math.random() * Math.floor(operation_type.length));
        let acc_index = getAccount();
        let random_op = operation_type[op_index];
        let random_acc = account_array[acc_index];
        let amount = Math.floor(Math.random() * 200);
        let op_payload;
        switch(random_op) {
        case 'transact_savings': {
            op_payload = {
                'amount': amount,
                'customer_id': random_acc,
                'transaction_type':random_op
            };
            break;
        }
        case 'deposit_checking': {
            op_payload = {
                'amount': amount,
                'customer_id': random_acc,
                'transaction_type':random_op
            };
            break;
        }
        case 'send_payment': {
            let accounts = get2Accounts();
            op_payload = {
                'amount': amount,
                'dest_customer_id': account_array[accounts[0]],
                'source_customer_id': account_array[accounts[1]],
                'transaction_type': random_op
            };
            break;
        }
        case 'write_check': {
            op_payload = {
                'amount': amount,
                'customer_id': random_acc,
                'transaction_type':random_op
            };
            break;
        }
        case 'amalgamate': {
            let accounts = get2Accounts();
            op_payload = {
                'dest_customer_id': account_array[accounts[0]],
                'source_customer_id': account_array[accounts[1]],
                'transaction_type': random_op
            };
            break;
        }
        default: {
            throw new Error('Invalid operation!!!');
        }
        }
        workload.push(op_payload);
    }
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('txnPerBatch')) {
        return Promise.reject(new Error('smallbank.mixed - \'txnPerBatch\' is missed in the arguments'));
    }
    txnPerBatch = args.txnPerBatch;

    if(!args.hasOwnProperty('queryRatio')) {
        return Promise.reject(new Error('smallbank.mixed - \'queryRatio\' is missed in the arguments'));
    }

    if (!(0 <= args.queryRatio && args.queryRatio <= 1)) {
        return Promise.reject(new Error('smallbank.mixed - \'queryRatio\' must be between 0 and 1.'));
    }
    queryRatio = args.queryRatio;

    let acc = require('./load.js');
    account_array = acc.account_array;

    if (account_array.length === 0) {
        return Promise.reject(new Error('No previous loaded account.'));
    }

    bc       = blockchain;
    contx    = context;
    return Promise.resolve();
};

module.exports.run = function() {
    if (Math.random() < queryRatio) {
        let query_promises = [];
        let acc_num  = account_array[Math.floor(Math.random()*(account_array.length))];
        for (let i=0; i < txnPerBatch; ++i) {
          query_promises.push(bc.queryState(contx, contx.contractID, 'v0', acc_num));
        }
        return Promise.all(query_promises);

    } else {
        let args = generateWorkload();
        return bc.invokeSmartContract(contx, contx.contractID, '1.0', args, 30);
    }
};

module.exports.end = function() {
    return Promise.resolve();
};
