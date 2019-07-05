/**
 * Copyright 2017 HUAWEI. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * @file, definition of the Quorum class, which implements the caliper's NBI for hyperledger quorum
 */

'use strict';

const TxStatus  = require('../comm/transaction');
const fs = require('fs');
const Web3 = require('web3');
const solc = require('solc');
const BlockchainInterface = require('../comm/blockchain-interface.js');
const commUtils = require('../comm/util');

/**
 * Implements {BlockchainInterface} for a Quorum backend.
 */
class Quorum extends BlockchainInterface{
    /**
     * Create a new instance of the {Quorum} class.
     * @param {string} config_path The path of the Quorum network configuration file.
     */
    constructor(config_path) {
        super(config_path);
        let quorum_setup = require(commUtils.resolvePath(config_path));
        // An array of obj {'url': <node_endpoint>, 'pub_key': <node_pub_key>}
        this.nodes_info = quorum_setup.quorum.network;
        if (quorum_setup.quorum.private === 1) {
            this.private = true;
            // Private to every node by default
            this.privateFor = [];
            this.nodes_info.forEach(node_info => {
                this.privateFor.push(node_info.pub_key);
            });
            // console.log("PrivateFor: ", this.privateFor);
        } else {
            console.log("Not Private...");
            this.private = false;
        }
    }

    /**
     * Initialize the {Quorum} object.
     * @return {Promise} The return promise.
     */
    init() {
        // donothing
        return Promise.resolve();
    }

    getBlockNumAsync() {
        const nodeUrl = this.nodes_info[0].url;
        const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
        return web3.eth.getBlockNumber();
    }

    registerBlockProcessing(clientIdx, callback, err_cb) {
        let idx = clientIdx % this.nodes_info.length;
        let nodeUrl = this.nodes_info[idx].url;
        let web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
        let blk_poll_interval = 50; // poll block for every 50ms
        let self = this;
        // console.log("Prepaer registraetion....");
        // return web3.eth.getBlock('latest').then((blk)=>{
        //     self.last_blk_num = parseInt(blk.number, 10);
            // self.last_blk_hash = blk.hash;
            // // console.log("At start blk num ", self.last_blk_num, " hash ", self.last_blk_hash);

            // self.blk_poll_interval = setInterval(() => {
            //     web3.eth.getBlock("latest").then((blk)=>{
            //         let blk_num = parseInt(blk.number, 10);
            //         let blk_hash = blk.hash;
            //         let parent_hash = blk.parentHash;
            //         let all_txns;

            //         if (blk_num === self.last_blk_num) {
            //             console.log("NO new block...");
            //             return Promise.resolve([]);
            //         } else {
            //             let txns = blk.transactions;
            //             all_txns = txns.splice(0);
            //             let blk_idxs = [];
            //             for (let blk_idx = blk_num - 1; 
            //                 blk_idx > self.last_blk_num; blk_idx--) {
            //                 blk_idxs.push(blk_idx);
            //             }

            //             return blk_idxs.reduce((prev, item)=>{
            //                 return prev.then((hash)=>{
            //                     return web3.eth.getBlock(hash);
            //                 }).then((blk)=>{
            //                     all_txns = all_txns.concat(blk.transactions);
            //                     let parent_hash = blk.parentHash;
            //                     return Promise.resolve(parent_hash);
            //                 }).catch((err)=>{
            //                     commUtils.log("Fail to get block with hash ", err);
            //                     return Promise.reject("Fail to get block with number ", item);
            //                 });
            //             }, Promise.resolve(parent_hash)).then((parent_hash)=>{
            //                 if (parent_hash === self.last_blk_hash) {
            //                     self.last_blk_num = blk_num;
            //                     self.last_blk_hash = blk_hash;
            //                     return Promise.resolve(all_txns);
            //                 } else {
            //                     commUtils.log("Inconsistent Hash!!");
            //                     return Promise.reject("Inconsistent Block Hash...");
            //                 }
            //             });
            //         }
            //     }).then((all_txns)=>{
            //         // console.log("On-chain txns: ", all_txns);
            //     }).catch((err)=>{
            //         commUtils.log("Error in getting the latest block ", err);
            //         return Promise.reject(err);
            //     })






        return web3.eth.getBlockNumber().then((blk_num)=>{
            self.last_blk_num = blk_num;
            self.blk_poll_interval = setInterval(() => {
                web3.eth.getBlockNumber().then((latest_blk_num)=>{
                    // console.log("Last: ", self.last_blk_num, " Latest: ", latest_blk_num);
                    let poll_blk_promises = [];

                    for (let blk_num = self.last_blk_num + 1;
                        blk_num <= latest_blk_num; blk_num++) {
                        // console.log("Blk Num: ", blk_num);
                        poll_blk_promises.push(
                            web3.eth.getBlock(blk_num).then((blk)=>{
                                // console.log("Gas Limit in Blk: ", blk.gasLimit);
                                // console.log("Gas used in Blk: ", blk.gasUsed);
                                // console.log("Transaction Count in Blk: ", blk.transactions.length);
                                return Promise.resolve(blk.transactions);
                            }).catch((err)=>{
                                console.log("Error in getBlock()");
                                return Promise.reject(err);
                            })
                        );
                    }
                    self.last_blk_num = latest_blk_num;
                    return Promise.all(poll_blk_promises);
                }).then((txns)=>{
                    //txns is an array of array of txn hashes
                    // We first compile them to a single array
                    let valid_txns = [];
                    let invalid_txns = [];  // In Quorum, all in-chain txns are valid. 
                    txns.forEach((txn_array)=>{
                        valid_txns = valid_txns.concat(txn_array);
                    });
                    // console.log("all on-chain txn: ", valid_txns);
                    callback(valid_txns, invalid_txns);
                }).catch((err)=>{
                    commUtils.log("Error in web3.getBlockNumber or getBlock", err);
                    err_cb(err);
                });
            }, blk_poll_interval);
            return Promise.resolve();
        }).catch((err)=>{
            console.log("Error in getting the start block number", err);
            err_cb(err);
            return Promise.reject(err);
        })
    }

    unRegisterBlockProcessing() {
        // do nothing
        clearInterval(this.poll_interval);
        return Promise.resolve();
    }


    /**
     * Deploy the chaincode specified in the network configuration file to all peers.
     * @return {Promise} The return promise.
     */
    installSmartContract(contracts_config) {
        let bc = this;
        let contract_config = contracts_config[0];
        let contract_name = contract_config.name;
        let contract_path = commUtils.resolvePath(contract_config.path);

        // Use the first node
        const nodeUrl = this.nodes_info[0].url;
        const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
        // compute the abi, bytecode using solc.
        const input = fs.readFileSync(contract_path);
        const output = solc.compile(input.toString(), 1); // convert buffer to string and compile
        // console.log("Compiled Output: ", output);
        const bytecode = '0x' + output.contracts[':' + contract_name].bytecode;
        const abi = JSON.parse(output.contracts[':' + contract_name].interface);
        // console.log("Generated ABI: ", abi_str);

        return web3.eth.getAccounts()
            .then((accounts)=>{
                let from_acc = accounts[0];
                let contractInstance = new web3.eth.Contract(abi);
                return  new Promise((resolve, reject) => {
                    contractInstance.deploy({
                        data: bytecode
                    }).send({
                        from: from_acc,
                        gas: 15000000,
                        privateFor: bc.private? bc.privateFor:undefined
                    }).once('receipt', function(receipt){
                        let addr = receipt.contractAddress.toString();
                        console.log("Receive contract addr in txn receipt ", addr);

                        return resolve([addr, abi]);
                    });
                });
                
        });
    }

    /**
     * Return the Quorum context associated with the given callback module name.
     * @param {string} name The name of the callback module as defined in the configuration files.
     * @param {object} args Unused.
     * @return {object} The assembled Quorum context.
     */
    getContext(name, args, clientIdx) {
        // return Promise.resolve();
        let self = this;
        return new Promise((resolve, reject)=>{
            let web3s = [];
            let my_web3; // endpoint to issue txn

            self.nodes_info.forEach((node_info, idx)=> {

                let node_url = node_info.url;
                const web3 = new Web3(new Web3.providers.HttpProvider(node_url));

                if (clientIdx % this.nodes_info.length === idx) {
                    // console.log("Issued URL: ", node_url);
                    my_web3 = web3; 
                }
                web3s.push(web3); 
            });

            resolve({web3s: web3s, my_web3: my_web3});
        });
    }

    sendTxn(contractInstance, funcName, args, from_acc) {
        let self = this;
        let txStatus = new TxStatus();
        return new Promise((resolve, reject) => {
            // console.log("Issued txn with function ", funcName, " and args ", args)
            contractInstance.methods[funcName](
                ...args
            ).send({
                from: from_acc,
                gas: 5000000,
                privateFor: self.private? self.privateFor:undefined
///////////////////////////////////////////////////////////////
// Check blocks for txn status
            }).once('transactionHash', (hash) => {
                txStatus.SetID(hash);
                resolve(txStatus);
///////////////////////////////////////////////////////////////
// Check txn receipt for status
            // }).once('receipt', (receipt) => {
            //     txStatus.SetID(receipt.transactionHash);
            //     txStatus.SetStatusSuccess();
            //     txStatus.SetVerification(true);

            //     resolve(txStatus);
///////////////////////////////////////////////////////////////
            });
        });
    }

    /**
     * Release the given Quorum context.
     * @param {object} context The Quorum context to release.
     * @return {Promise} The return promise.
     */
    releaseContext(context) {
        return Promise.resolve();
    }


    /**
     * Invoke the given chaincode according to the specified options. Multiple transactions will be generated according to the length of args.
     * @param {object} context The Quorum context returned by {getContext}.
     * @param {string} contractID The name of the chaincode.
     * @param {string} contractVer The version of the chaincode.
     * @param {Array} args Array of JSON formatted arguments for transaction(s). Each element containts arguments (including the function name) passing to the chaincode. JSON attribute named transaction_type is used by default to specify the function name. If the attribute does not exist, the first attribute will be used as the function name.
     * @param {number} timeout The timeout to set for the execution in seconds.
     * @return {Promise<object>} The promise for the result of the execution.
     */
    invokeSmartContract(context, contractID, contractVer, args, timeout) {
        const web3 = context.my_web3;
        // let node_url = this.nodes_info[context.clientIdx % this.nodes_info.length].url;
        // const web3 = new Web3(new Web3.providers.HttpProvider(node_url));
        let address = contractID[0];
        let abi = contractID[1];

        // let contractInstance = web3.eth.contract(abi).at(address);
        let contractInstance = new web3.eth.Contract(abi, address);
        let self = this;


        return web3.eth.getAccounts()
            .then((accounts)=>{
                let acc_id = Math.floor(context.clientIdx / context.web3s.length) % accounts.length;
                // console.log("Selected Account and Idx: ", accounts[acc_id], acc_id)
                let promises = [];
                let from_acc = accounts[acc_id];
                args.forEach((item, index)=>{
                    // let bef = Date.now();
                    try {
                        let simpleArgs = [];
                        let func;
                        for(let key in item) {
                            if(key === 'transaction_type') {
                                func = item[key].toString();
                            }
                            else {
                                simpleArgs.push(item[key]);
                            }
                        }
                        promises.push(self.sendTxn(contractInstance, func, simpleArgs, from_acc));
                    } catch(err) {
                        let badResult = new TxStatus('artifact');
                        badResult.SetStatusFail();
                        badResult.SetVerification(true);
                        promises.push(Promise.resolve(badResult));
                    }
                });
                return Promise.all(promises);
            });
    }

    /**
     * Query the given chaincode according to the specified options.
     * @param {object} context The Quorum context returned by {getContext}.
     * @param {string} contractID The name of the chaincode.
     * @param {string} contractVer The version of the chaincode.
     * @param {string} key The argument to pass to the chaincode query.
     * @return {Promise<object>} The promise for the result of the execution.
     */
    queryState(context, contractID, contractVer, key) {
        let address = contractID[0];
        let abi = contractID[1];

        let promises = [];
        let self = this;
        let func = "query";  // Assume each quorum contract has a function named as 'get'
        let txStatus = new TxStatus("00000000000");

        let all_idx = [];

        let num_web3s = context.web3s.length;
        for (var i = 0;i < num_web3s; i++) {all_idx.push(i); }
        // let selected_idx = commUtils.shuffle(all_idx).slice(0, num_web3s / 2 + 1);
        let selected_idx = commUtils.shuffle(all_idx).slice(0, 1);
        context.web3s.forEach((web3, idx)=>{
            if (selected_idx.includes(idx)) {
                let query_promise = web3.eth.getAccounts().then((accounts)=>{
                    let from_acc = accounts[0];
                    let contractInstance = new web3.eth.Contract(abi, address);

                    return contractInstance.methods[func](key).call({from: from_acc});
                });
                    // return self.callMethod(contractInstance, func, [key], from_acc, endpoint); });

                promises.push(query_promise);
            }
        });
        // console.log("Promise len: ", promises.length);
        // Resolve only all nodes reply
        return Promise.all(promises).then((results)=>{
            txStatus.SetStatusSuccess();
            txStatus.SetResult(results[0]);
            // console.log("Query Result: ", results[0]);
            txStatus.SetVerification(true);
            return Promise.resolve(txStatus);
        }).catch( (err) => {
            commUtils.log("Fail to query on key ", key);
            return Promise.reject(err);
        });
    }
}
module.exports = Quorum;
