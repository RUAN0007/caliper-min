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

function generateWorkload() {
    let workload = [];
        
    let op_payload = {
        'key': [],
        'transaction_type': 'empty'
    };
    workload.push(op_payload);
    return workload;
}

module.exports.init = function(blockchain, context, args) {
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
