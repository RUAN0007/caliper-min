/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

var process = require('process');
const TxStatus  = require('../comm/transaction');

/**
 * BlockChain class, define operations to interact with the blockchain system under test
 */
class Blockchain {
    /**
     * Constructor
     * @param {String} configPath path of the blockchain configuration file
     */
    constructor(configPath) {
        let config = require(configPath);
        // A global map to associate unconfirmed txn ID to its status
        this.unconfirmed_txn_map = {};
        // An array of 3-value tuple, <an array of unconfirmed txn_status, resolve, time_out>
        this.txn_batches = [];
        this.blk_processing = false;
        if(config.hasOwnProperty('fabric')) {
            let fabric = require('../fabric/fabric.js');
            this.bcType = 'fabric';
            this.bcObj = new fabric(configPath);
        }
        else if(config.hasOwnProperty('sawtooth')) {
            let sawtooth = require('../sawtooth/sawtooth.js');
            this.bcType = 'sawtooth';
            this.bcObj = new sawtooth(configPath);
        }
        else if(config.hasOwnProperty('iroha')) {
            let iroha = require('../iroha/iroha.js');
            this.bcType = 'iroha';
            this.bcObj = new iroha(configPath);
        }
        else if(config.hasOwnProperty('composer')) {
            let composer = require('../composer/composer.js');
            this.bcType = 'composer';
            this.bcObj = new composer(configPath);
        }
        else if(config.hasOwnProperty('quorum')) {
            let quorum = require('../quorum/quorum.js');
            this.bcType = 'quorum';
            this.bcObj = new quorum(configPath);
        }
        else {
            this.bcType = 'unknown';
            throw new Error('Unknown blockchain config file ' + configPath);
        }
    }

    /**
     * return the blockchain's type
     * @return {string} type of the blockchain
     */
    gettype() {
        return this.bcType;
    }

    /**
    * Initialise test environment, e.g. create a fabric channel for the test
    * @return {Promise} promise object
    */
    init() {
        return this.bcObj.init();
    }

    /**
     * Perform required preparation for test clients, e.g. enroll clients and obtain key pairs
     * @param {Number} number count of test clients
     * @return {Promise} array of obtained material for test clients
     */
    prepareClients (number) {
        return this.bcObj.prepareClients(number);
    }

    finishIssueTxn() {
        let self = this;
        this.finish_timeout = setTimeout(()=>{
            for(let i=0; i<self.txn_batches.length;i++) {
                let txn_statuses = self.txn_batches[i][0];
                let resolve_func = self.txn_batches[i][1];
                for (let j=0; j < txn_statuses.length; j++) {
                    let txn_status = txn_statuses[j];
                    if (!txn_status.IsVerified() ) {
                        txn_status.SetVerification(true);
                        txn_status.SetStatusFail();
                    }
                }
                resolve_func(txn_statuses);
            }
        }, 30*1000);  // Finish all pending txns in 30s
    }

    getBlockNumAsync() {
        return this.bcObj.getBlockNumAsync();
    }

    
    registerBlockProcessing(clientIdx, err_cb) {
        console.log("Register for block processing...");

        let self = this;
        self.clientIdx = clientIdx;
        self.txn_count = 0;
        self.blk_count = 0;


        return this.bcObj.registerBlockProcessing(clientIdx, function (valid_txnIds, invalid_txnIds) {
            let blk_time = Date.now();
            // Assume the size of two array reflects the number of txns in a block. 
            self.txn_count += valid_txnIds.length + invalid_txnIds.length;
            self.blk_count += 1;
            // Filter txns by map
            valid_txnIds.forEach(valid_txnId => {
                if (self.unconfirmed_txn_map.hasOwnProperty(valid_txnId)) {
                    self.unconfirmed_txn_map[valid_txnId].SetStatusSuccess();
                    self.unconfirmed_txn_map[valid_txnId].SetVerification(true);
                    self.unconfirmed_txn_map[valid_txnId].Set('time_commit', blk_time);
                    delete self.unconfirmed_txn_map[valid_txnId];
                }
            });

            invalid_txnIds.forEach(invalid_txnId => {
                if (self.unconfirmed_txn_map.hasOwnProperty(invalid_txnId)) {
                    self.unconfirmed_txn_map[invalid_txnId].SetStatusFail();
                    self.unconfirmed_txn_map[invalid_txnId].SetVerification(true);
                    delete self.unconfirmed_txn_map[invalid_txnId];
                }
            });

            let finished_batch_idx = [];

            for(let i=0; i<self.txn_batches.length;i++){
                let all_finished = true;
                let txn_statuses = self.txn_batches[i][0];
                for (let j=0; j < txn_statuses.length; j++) {
                    let txn_status = txn_statuses[j];
                    if (!txn_status.IsVerified() ) {
                        // 30s Time out a txn 
                        if (Date.now() - txn_status.GetTimeCreate() > 30 * 1000) {
                            txn_status.SetVerification(true);
                            txn_status.SetStatusFail();
                            delete self.unconfirmed_txn_map[txn_status.GetID()];
                            console.log('Time out txn [' + txn_status.GetID().substring(0, 5) + '...]');
                        } else {
                            all_finished = false;
                        }
                    }
                }
                if (all_finished) {
                    finished_batch_idx.push(i);
                }
            }
            // console.log("" + finished_batch_idx.length + " txn batch finished. ");
            // Remove the txn batch if its txns have all finished. 
            for (let i = finished_batch_idx.length - 1;i >= 0; i--) {
                let remove_idx = finished_batch_idx[i];
                let finished_batch = self.txn_batches.splice(remove_idx, 1)[0];
                let txn_statuses = finished_batch[0];
                let resolve_func = finished_batch[1];
                // let resolve_timeout = finished_batch[2];
                // clearTimeout(resolve_timeout);
                resolve_func(txn_statuses);
            }
        }, err_cb);
    }

    unRegisterBlockProcessing() {
        console.log("Unregistered Block processing...");
        if (this.clientIdx ===0 ) {
            console.log("Avg # of Txns in Block: ", this.txn_count / this.blk_count);
        }
        clearTimeout(this.finish_timeout);
        return this.bcObj.unRegisterBlockProcessing();
    }

    /**
    * Install smart contract(s), detail informations are defined in the blockchain configuration file
    * @return {Promise} promise object
    */
    installSmartContract(contracts_config) {
        return this.bcObj.installSmartContract(contracts_config);
    }

    /**
     * Get a context for subsequent operations, e.g. invoke smart contract or query state
     * @param {String} name name of the context
     * @param {Object} args adapter specific arguments
     * @return {Promise} obtained context object
     */
    getContext(name, args, clientIdx) {
        return this.bcObj.getContext(name, args, clientIdx);
    }

    /**
     * Release a context as well as related resources
     * @param {Object} context adapter specific object
     * @return {Promise} promise object
     */
    releaseContext(context) {
        return this.bcObj.releaseContext(context);
    }

    /**
     * Invoke smart contract/submit transactions and return corresponding transactions' status
     * @param {Object} context context object
     * @param {String} contractID identiy of the contract
     * @param {String} contractVer version of the contract
     * @param {Array} args array of JSON formatted arguments for multiple transactions
     * @param {Number} timeout request timeout, in second
     * @return {Promise} txStatus object or an array of txStatus objects
     */
    invokeSmartContract(context, contractID, contractVer, args, timeout, endorseSleepMS) {
        let arg, time;    // compatible with old version
        if(Array.isArray(args)) {
            arg = args;
        }
        else if(typeof args === 'object') {
            arg = [args];
        }
        else {
            return Promise.reject(new Error('Invalid args for invokeSmartContract()'));
        }

        if(typeof timeout !== 'number' || timeout < 0) {
            time = 120;
        }
        else {
            time = timeout;
        }

        let self = this;

        context.engine.submitCallback(arg.length);

        return this.bcObj.invokeSmartContract(context, contractID, contractVer, arg, time, endorseSleepMS).then((tx_statuses)=> {
            let allConfirmed = true;
            tx_statuses.forEach(txn_status => {
                txn_status.Set('operation', 'invoke');
            ////////////////////////////////////////////////////////
            // These four metric fields are used by Fabric only.
            // However, we still set them even if other platforms donot need them,
            // as these metrics will be read and compiled for statistics collector. 

                if (txn_status.Get('time_create') === undefined) { 
                    txn_status.Set('time_create', Date.now());
                }
                if (txn_status.Get('time_endorse') === undefined) { 
                    txn_status.Set('time_endorse', Date.now());
                }
                if (txn_status.Get('time_order') === undefined) { 
                    txn_status.Set('time_order', Date.now());
                }
                if (txn_status.Get('time_commit') === undefined) { 
                    txn_status.Set('time_commit', Date.now());
                }
            ///////////////////////////////////////////////////////
                if (!txn_status.IsVerified()) {
                    allConfirmed = false;
                    self.unconfirmed_txn_map[txn_status.GetID()] = txn_status;
                }
            });
            return new Promise((resolve, reject) => {
                if (allConfirmed) {
                    resolve(tx_statuses);
                } else {
                    // let resolve_timeout = setTimeout(() => {
                    //     tx_statuses.forEach(txn_status => {
                    //         if (!txn_status.IsVerified()) {
                    //             let txn_id = txn_status.GetID();
                    //             txn_status.SetStatusFail();
                    //             txn_status.SetVerification(true);
                    //             console.log('Time out txn [' + txn_id.substring(0, 5) + '...]:');
                    //         }
                    //     });
                    //     resolve(tx_statuses);
                    // }, 30 * 1000); // 30s to time outgg
                    // Resolve will be called during block processing. 
                    // self.txn_batches.push([tx_statuses, resolve, resolve_timeout]);
                    self.txn_batches.push([tx_statuses, resolve]);
                }
            });

        });
    }

    /**
     * Query state from the ledger
     * @param {Object} context context object from getContext
     * @param {String} contractID identiy of the contract
     * @param {String} contractVer version of the contract
     * @param {String} key lookup key
     * @return {Promise} as invokeSmateContract()
     */
    queryState(context, contractID, contractVer, key) {
        context.engine.submitCallback(1);

        return new Promise((resolve, reject)=>{
            let resolve_timeout = setTimeout(() => {
                let txn_status = new TxStatus("0000000000");
                txn_status.Set('operation', 'query');
                txn_status.SetStatusFail();
                txn_status.SetVerification(true);
                console.log('Time out blockchain query txn (30s)...');
                resolve(txn_status);
            }, 30 * 1000); // 30s to time out

            this.bcObj.queryState(context, contractID, contractVer, key).then((txStatus)=>{
                txStatus.Set('operation', 'query');
                clearTimeout(resolve_timeout);
                resolve(txStatus);
            })
        });



        let resolve_timeout = setTimeout(() => {
            let txn_status = new TxStatus("0000000000");
            txn_status.SetStatusFail();
            txn_status.SetVerification(true);
            console.log('Time out blockchain query txn (30s)...');
            return Promise.resolve(txn_status);
        }, 30 * 1000); // 30s to time out

        return this.bcObj.queryState(context, contractID, contractVer, key)
            .then((txStatus)=>{
                clearTimeout(resolve_timeout);
                txStatus.Set('operation', 'query');
                return Promise.resolve(txStatus);
            });
    }

    /**
    * Calculate the default transaction statistics
    * @param {Array} results array of txStatus
    * @param {Boolean} detail indicates whether to keep detailed information
    * @return {JSON} txStatistics JSON object
    */
    getDefaultTxStats(results, detail) {
        let succ = 0, fail = 0, delay = 0;
        let minFinal, maxFinal, minCreate, maxCreate;
        let minDelay = 100000, maxDelay = 0;
        let delays = [];
        for(let i = 0 ; i < results.length ; i++) {
            let stat   = results[i];
            let create = stat.GetTimeCreate();

            if(typeof minCreate === 'undefined') {
                minCreate = create;
                maxCreate = create;
            }
            else {
                if(create < minCreate) {
                    minCreate = create;
                }
                if(create > maxCreate) {
                    maxCreate = create;
                }
            }

            if(stat.IsCommitted()) {
                succ++;
                let final = stat.GetTimeFinal();
                let d     = (final - create) / 1000;
                if(typeof minFinal === 'undefined') {
                    minFinal = final;
                    maxFinal = final;
                }
                else {
                    if(final < minFinal) {
                        minFinal = final;
                    }
                    if(final > maxFinal) {
                        maxFinal = final;
                    }
                }

                delay += d;
                if(d < minDelay) {
                    minDelay = d;
                }
                if(d > maxDelay) {
                    maxDelay = d;
                }

                if(detail) {
                    delays.push(d);
                }
            }
            else {
                fail++;
            }
        }

        let stats = {
            'succ' : succ,
            'fail' : fail,
            'create' : {'min' : minCreate/1000, 'max' : maxCreate/1000},    // convert to second
            'final'  : {'min' : minFinal/1000,  'max' : maxFinal/1000 },
            'delay'  : {'min' : minDelay,  'max' : maxDelay, 'sum' : delay, 'detail': (detail?delays:[]) },
            'out' : []
        };
        return stats;
    }


    /**
    * Calculate the delay breakdown for invoke operation
    * @param {Array} results array of txStatus
    * @param {Boolean} detail indicates whether to keep detailed information
    * @return {JSON} txStatistics JSON object
    */
    getDetailedDelayStats(results, detail) {
        let s2e_delay_sum = 0; // delay from submission to endorsement
        let e2o_delay_sum = 0;  // delay from endorsement to ordering
        let o2f_delay_sum = 0;  // delay from ordering to commit
        let delay_sum = 0;
        let succ_count = 0;

        for(let i = 0 ; i < results.length ; i++) {
            let stat   = results[i];
            if (stat.IsCommitted()) {
                let create = stat.Get("time_create");
                let endorse = stat.Get("time_endorse");
                let order = stat.Get("time_order");
                let commit = stat.Get("time_commit");

                succ_count += 1;
                s2e_delay_sum += (endorse - create) / 1000; 
                e2o_delay_sum += (order - endorse) / 1000; 
                o2f_delay_sum += (commit - order) / 1000; 
                delay_sum += (commit - create) / 1000;
            }  // end if
        }  // end for

        let stats = {
            'succ': succ_count,
            's2e_sum' : s2e_delay_sum,
            'e2o_sum' : e2o_delay_sum,
            'o2f_sum' : o2f_delay_sum,
            'delay_sum' : delay_sum,
        };
        return stats;     
    }



    /**
     * merge an array of default 'txStatistics', the result is in first object of the array
     * Note even failed the first object of the array may still be changed
     * @param {Array} results txStatistics array
     * @return {Number} 0 if failed; otherwise 1
     */
    static mergeDefaultTxStats(results) {
        try{
            // skip invalid result
            let skip = 0;
            for(let i = 0 ; i < results.length ; i++) {
                let result = results[i];
                if(!result.hasOwnProperty('succ') || !result.hasOwnProperty('fail') || (result.succ + result.fail) === 0) {
                    skip++;
                }
                else {
                    break;
                }
            }
            if(skip > 0) {
                results.splice(0, skip);
            }

            if(results.length === 0) {
                return 0;
            }

            let r = results[0];
            for(let i = 1 ; i < results.length ; i++) {
                let v = results[i];
                if(!v.hasOwnProperty('succ') || !v.hasOwnProperty('fail') || (v.succ + v.fail) === 0) {
                    continue;
                }
                r.succ += v.succ;
                r.fail += v.fail;
                r.out.push.apply(r.out, v.out);
                if(v.create.min < r.create.min) {
                    r.create.min = v.create.min;
                }
                if(v.create.max > r.create.max) {
                    r.create.max = v.create.max;
                }
                if(v.final.min < r.final.min) {
                    r.final.min = v.final.min;
                }
                if(v.final.max > r.final.max) {
                    r.final.max = v.final.max;
                }
                if(v.delay.min < r.delay.min) {
                    r.delay.min = v.delay.min;
                }
                if(v.delay.max > r.delay.max) {
                    r.delay.max = v.delay.max;
                }
                r.delay.sum += v.delay.sum;
                for(let j = 0 ; j < v.delay.detail.length ; j++) {
                    r.delay.detail.push(v.delay.detail[j]);
                }
            }
            return 1;
        }
        catch(err) {
            return 0;
        }
    }

    /**
     * create a 'null' txStatistics object
     * @return {JSON} 'null' txStatistics object
     */
    static createNullDefaultTxStats() {
        return {'succ': 0, 'fail': 0, 
            'create' : {'min' : 0, 'max' : 0},    
            'final'  : {'min' : 0,  'max' : 0 },
            'delay'  : {'min' : 0,  'max' : 0, 'sum' : 0, 'detail': []},
            'out' : []
        };
    }

    /**
     * create a 'null' txStatistics object
     * @return {JSON} 'null' txStatistics object
     */
    static createNullDetailedDelayStats() {
        let stats = {
            'succ' : 0,
            's2e_sum' : 0,
            'e2o_sum' : 0,
            'o2f_sum' : 0,
            'delay_sum' : 0
        };
        return stats;;
    }

    static mergeDetailedDelayStats(results) {
        let skip = 0;
        if (results === undefined) {
            return 0;
        }
        for(let i = 0 ; i < results.length ; i++) {
            let result = results[i];
            if(result === undefined || !result.hasOwnProperty('succ') || result.succ === 0) {
                skip++;
            }
            else {
                break;
            }
        }
        if(skip > 0) {
            results.splice(0, skip);
        }

        if (results.length > 0) {
            let r = results[0];
            for(let i = 1 ; i < results.length ; i++) {
                let result = results[i];
                r.succ += result.succ;
                r.s2e_sum += result.s2e_sum;
                r.e2o_sum += result.e2o_sum;
                r.o2f_sum += result.o2f_sum;
                r.delay_sum += result.delay_sum;
            }
            return 1;

        } else {
            return 0;
        }
    }
}

module.exports = Blockchain;
