/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

/**
 * Interface of blockchain adapters
 */
class BlockchainInterface {
    /**
     * Constructor
     * @param {String} configPath path of the blockchain configuration file
     */
    constructor(configPath) {
        this.configPath = configPath;
    }

    /**
     * Initialise test environment
     */
    init() {
        throw new Error('init is not implemented for this blockchain system');
    }




    /**
     * Install smart contract(s)
     */
    installSmartContract(chaincodes_config) {
        throw new Error('installSmartContract is not implemented for this blockchain system');
    }

    /**
     * Perform required preparation for test clients
     * @param {Number} number count of test clients
     * @return {Promise} obtained material for test clients
     */
    prepareClients (number) {
        let result = [];
        for(let i = 0 ; i< number ; i++) {
            result[i] = {}; // as default, return an empty object for each client
        }
        return Promise.resolve(result);
    }

    /**
     * Get a context for subsequent operations
     * 'engine' attribute of returned context object must be reserved for benchmark engine to extend the context
     *  engine = {
     *   submitCallback: callback which must be called once new transaction(s) is submitted, it receives a number argument which tells how many transactions are submitted
     * }
     * @param {String} name name of the context
     * @param {Object} args adapter specific arguments
     */
    getContext(name, args) {
        throw new Error('getContext is not implemented for this blockchain system');
    }

    /**
     * Release a context as well as related resources
     * @param {Object} context adapter specific object
     */
    releaseContext(context) {
        throw new Error('releaseContext is not implemented for this blockchain system');
    }

    /**
     * Invoke a smart contract
     * @param {Object} context context object
     * @param {String} contractID identiy of the contract
     * @param {String} contractVer version of the contract
     * @param {Array} args array of JSON formatted arguments for multiple transactions
     * @param {Number} timeout request timeout, in second
     */
    invokeSmartContract(context, contractID, contractVer, args, timeout) {
        throw new Error('invokeSmartContract is not implemented for this blockchain system');
    }

    /**
     * Query state from the ledger
     * @param {Object} context context object from getContext
     * @param {String} contractID identiy of the contract
     * @param {String} contractVer version of the contract
     * @param {String} key lookup key
     */
    queryState(context, contractID, contractVer, key) {
        throw new Error('queryState is not implemented for this blockchain system');
    }

    getBlockInfo(blk_data) {
        throw new Error('blk_data is not implemented for this blockchain system');
    }


    /**
     * Get adapter specific transaction statistics
     * @param {JSON} stats txStatistics object
     * @param {Array} results array of txStatus objects
     */
    getDefaultTxStats(stats, results) {
        throw new Error('getDefaultTxStats is not implemented for this blockchain system');
    }
}

module.exports = BlockchainInterface;
