/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';


module.exports.info  = 'custom_txn';

var prob = require('prob.js');

let bc, contx;
let accountNum;
let zipf_sampler;

function generateWorkload() {
    let workload = [];
    let accountName = 'acc' + Math.floor(zipf_sampler() - 1);
    let args = [accountName]
        
    let op_payload = {
        'key': args,
        'transaction_type': 'modify'
    };
    workload.push(op_payload);
    return workload;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('accountNum')) {
        return Promise.reject(new Error('custom.modify - \'accountNum\' is missed in the arguments'));
    }
    accountNum = args.accountNum;

    if(!args.hasOwnProperty('zipf_s')) {
        return Promise.reject(new Error('custom.modifyxn - \'zipf_s\' is missed in the arguments.'));
    }
    zipf_sampler= prob.zipf(args.zipf_s, accountNum);

    bc       = blockchain;
    contx    = context;
    return Promise.resolve();
};

module.exports.run = function() {
    let args = generateWorkload();
    return bc.invokeSmartContract(contx, contx.contractID, 'v0', args, 30)
};

module.exports.end = function() {
    return Promise.resolve();
};
