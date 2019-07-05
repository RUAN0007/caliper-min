/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const RateInterface = require('./rateInterface.js');
const util = require('../util');
let Sleep = require('../util').sleep;

/**
 * This controller will send transactions at a specified fixed interval,
 * but when too many transactions are unfinished, it will sleep a period
 * of time.
 */
class EquilRateController extends RateInterface{
    /**
     * Constructor
     * @param {Object} blockchain the blockchain under test
     * @param {JSON} opts the configuration options
     */
    constructor(blockchain, opts) {
        super(blockchain, opts);
    }

    /**
     * Initialise the rate controller with a passed msg object
     * - Only require the desired TPS from the standard msg options
     * @param {JSON} msg the initialisation message
     */
    init(msg) {
        const tps = this.options.initial_tps;
        const tps_incr = this.options.tps_incr; // tps incremental per sec
        const max_backlog_txn = this.options.backlog;

        const tpsPerClient = msg.totalClients ? (tps / msg.totalClients) : tps;
        this.cur_tps = tpsPerClient;

        const tpsIncrPerClient = msg.totalClients ? (tps_incr / msg.totalClients) : tps_incr;
        this.tps_incr = tpsIncrPerClient;

        this.backLogPerClient = msg.totalClients ? (max_backlog_txn / msg.totalClients) : max_backlog_txn;

        this.total_sleep_time = 0;
        this.last_idx = 0;
    }

    /**
    * Perform the rate control action based on knowledge of the start time, current index, and current results.Sleep a suitable time
    * @param {number} start, generation time of the first test transaction
    * @param {number} idx, sequence number of the current test transaction
    * @param {Array} currentResults, current result set
    * @param {Array} resultStats, result status set
    * @return {promise} the return promise
    */
    async applyRateControl(start, idx, currentResults, resultStats) {
        if (!this.equil) {
            if (resultStats && resultStats.length > 0) {
                let stats = resultStats[0];
                // if (this.interval * 1000 < Date.now() - this.last_checkpoint) {
                let unfinished = idx - (stats.succ + stats.fail);
                let with20s = ((Date.now() - start) < 20000);
                if (!with20s && this.backLogPerClient < unfinished) {
                    this.equil = true;
                    console.log("Reach Equilibrium at tps: ", this.cur_tps);
                } else {
                    this.cur_tps += this.tps_incr * ((Date.now() - start) / 1000)
                }
            }  // end if result
        }  // end if this.equil
        let sleepTime = 1000 / this.cur_tps;

        if(sleepTime === 0) {
            return Promise.resolve();
        }

        this.total_sleep_time += sleepTime * (idx - this.last_idx);
        this.last_idx = idx;
        let diff = this.total_sleep_time - (Date.now() - start);

        if( diff > 5) {
            return Sleep(diff);
        } else {
            return Promise.resolve();
        }
    }
}

module.exports = EquilRateController;