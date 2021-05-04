/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/


'use strict';

const log = require('./comm/util.js').log;
let process = require('process');

let configFile;
let networkFile;
let resultFile;
/**
 * sets the config file
 * @param {string} file indicates config file name
 * @returns {void}
 **/
function setConfig(file) {
    configFile = file;
}

/**
 * sets the network file
 * @param {string} file indicates network file name
 * @returns {void}
 **/
function setNetwork(file) {
    networkFile = file;
}

function setResult(file) {
    resultFile = file;
}

/**
 * iniate and starts the benchmark test with input config params
 * @returns {void}
 **/
function main() {
    let program = require('commander');
    program.version('0.1')
        .option('-c, --config <file>', 'config file of the benchmark', setConfig)
        .option('-n, --network <file>', 'config file of the blockchain system under test', setNetwork)
        .option('-r, --result <file>', 'result file of the blockchain system under test, if not provided, default result.json will be used', setResult)
        .parse(process.argv);

    let path = require('path');
    let fs = require('fs-extra');
    let cur_work_dir = process.cwd();

    let absConfigFile = path.join(cur_work_dir, configFile);
    if(!fs.existsSync(absConfigFile)) {
        log('Config file ' + absConfigFile + ' does not exist');
        return;
    }

    let absNetworkFile = path.join(cur_work_dir, networkFile);

    if(!fs.existsSync(absNetworkFile)) {
        log('Network file ' + absNetworkFile + ' does not exist');
        return;
    }

    let framework = require('./comm/bench-flow.js');
    if (typeof resultFile === 'undefined') {
        framework.run(absConfigFile, absNetworkFile, 'result.json')
    } else {
        framework.run(absConfigFile, absNetworkFile, resultFile);
    }
}

main();
