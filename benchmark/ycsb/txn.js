/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

var ds = require('discrete-sampling');
var prob = require('prob.js');


module.exports.info  = 'ycsb_txn';

let bc, contx;
let txnPerBatch;

let recordCount;
let readRatio;
let insertRatio;
let updateRatio;
let deleteRatio;
let modifyRatio;
let lqueryRatio;
let distribution;

let buildKey;
let buildValue;

let operation_type = ['insert', 'update', 'remove', 'readmodifywrite', 'lquery'];

let uniform_sampler;
let zipf_sampler;
let discrete_sampler;

function nextKey() {
   let key = 0; 
   if (distribution === "uniform") {
      key = Math.floor(uniform_sampler())
   } else if (distribution === "zipf") {
      key = Math.floor(zipf_sampler() - 1);
   } else {
      throw new Error('No Other distribution allowed. ');          
   }
   console.log("Selected key: ", key);
   return buildKey(key);
}

function generateWorkload() {
    let workload = [];

    for(let j= 0; j<txnPerBatch; j++) {
        let op = operation_type[discrete_sampler.draw()];
        let key = nextKey();
        let op_payload;
        switch(op) {
        case 'insert': {
            throw new Error('Not implemented for Insert!');          
            break;
        }
        case 'update': 
        case 'readmodifywrite': 
        {
            // console.log("Updated Key: ", key);
            op_payload = {
                'key': key,
                'val': buildValue(),
                'transaction_type':op
            };
            break;
        }
        case 'remove': 
        {
            op_payload = {
                'key': key,
                'transaction_type':op
            };
            break;
        }
        case 'lquery': 
        {
            op_payload = {
                'key': key,
                'transaction_type': 'query'
            };
            // console.log("Issue a lquery...");
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

function inRange(ratio) {
    return -0.01 <= ratio && ratio <= 1.01;
}

module.exports.init = function(blockchain, context, args) {
    if(!args.hasOwnProperty('txnPerBatch')) {
        return Promise.reject(new Error('ycsb.txn - \'txnPerBatch\' is missed in the arguments'));
    }
    txnPerBatch = args.txnPerBatch;

    if(!args.hasOwnProperty('readRatio') || !inRange(args.readRatio)) {
        return Promise.reject(new Error('ycsb.txn - \'readRatio\' is missed in the arguments or not in the correct range.'));
    }
    readRatio = args.readRatio;

    if(!args.hasOwnProperty('insertRatio') || !inRange(args.insertRatio)) {
        return Promise.reject(new Error('ycsb.txn - \'insertRatio\' is missed in the arguments or not in the correct range.'));
    }
    insertRatio = args.insertRatio;
    
    if(!args.hasOwnProperty('updateRatio') || !inRange(args.updateRatio)) {
        return Promise.reject(new Error('ycsb.txn - \'updateRatio\' is missed in the arguments or not in the correct range.'));
    }
    updateRatio = args.updateRatio;
    
    if(!args.hasOwnProperty('deleteRatio') || !inRange(args.deleteRatio)) {
        return Promise.reject(new Error('ycsb.txn - \'deleteRatio\' is missed in the arguments or not in the correct range.'));
    }
    deleteRatio = args.deleteRatio;
    
    if(!args.hasOwnProperty('modifyRatio') || !inRange(args.modifyRatio)) {
        return Promise.reject(new Error('ycsb.txn - \'modifyRatio\' is missed in the arguments or not in the correct range.'));
    }
    modifyRatio = args.modifyRatio;
    if(args.hasOwnProperty('lqueryRatio') ) {
        if (inRange(args.lqueryRatio)) {
            lqueryRatio = args.lqueryRatio;
        } else {
            return Promise.reject(new Error('lqueryRatio ' + args.lqueryRatio + " is invalid..."));
        }
    } else {
        lqueryRatio = 0;
    }

    let totalRatio = readRatio + insertRatio + updateRatio + deleteRatio + modifyRatio + lqueryRatio;
    if (!(0.999 <= totalRatio && totalRatio <= 1.0001)) {
        return Promise.reject(new Error('ycsb.txn - The ratio is not normalized. '));
    }


    if(!args.hasOwnProperty('recordCount')){
        return Promise.reject(new Error('ycsb.txn - \'recordCount\' is missed in the arguments.'));
    }
    recordCount = args.recordCount;


    if(!args.hasOwnProperty('distribution')) {
        return Promise.reject(new Error('ycsb.txn - \'distribution\' is missed in the arguments.'));
    }
    distribution = args.distribution;

    discrete_sampler = ds.Discrete([insertRatio, updateRatio, deleteRatio, modifyRatio, lqueryRatio]);
    if (distribution === "zipf") {
        if(!args.hasOwnProperty('zipf_s')) {
            return Promise.reject(new Error('ycsb.txn - \'zipf_s\' is missed in the arguments.'));
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
    buildValue = insert.buildValue;


    bc       = blockchain;
    contx    = context;
    return Promise.resolve();
};

module.exports.run = function() {
    let prob = Math.random();
    // console.log("read ratio ", readRatio, " prob ", prob)
    if (prob < readRatio) {
        let read_promises = [];
        for (let i=0; i < txnPerBatch; ++i) {
          let key = nextKey();
          // console.log("Queried Key: ", key);
          read_promises.push(bc.queryState(contx, contx.contractID, 'v0', key));
        }
        return Promise.all(read_promises);
    } else {
        let args = generateWorkload();
        return bc.invokeSmartContract(contx, contx.contractID, 'v0', args, 30);
    }
};

module.exports.end = function() {
    return Promise.resolve();
};
