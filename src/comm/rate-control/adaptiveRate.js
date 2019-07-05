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
class AdaptiveRateController extends RateInterface{
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
        const tpsPerClient = msg.totalClients ? (tps / msg.totalClients) : tps;
        this.cur_tps = tpsPerClient;


        this.min_backlog_txn = msg.totalClients ? 
                                this.options.min_backlog_txn / msg.totalClients:
                                this.options.min_backlog_txn;

        this.max_backlog_txn = msg.totalClients ? 
                                this.options.max_backlog_txn / msg.totalClients:
                                this.options.max_backlog_txn;
    
        this.adaptive_rate = this.options.adaptive_rate ? 
                             this.options.adaptive_rate: 0.9;

        this.max_tps = this.options.max_tps ? this.options.max_tps / msg.totalClients : 0;
        
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
        if (resultStats && resultStats.length > 0) {
            let stats = resultStats[0];
            let unfinished = idx - (stats.succ + stats.fail);

            if (this.min_backlog_txn < this.unfinished_per_client) {
                this.cur_tps /= this.adaptive_rate;
            } else if (this.max_backlog_txn < unfinished) {
                this.cur_tps *= this.adaptive_rate;
            }
        }

        if (this.max_tps > 0 && this.max_tps < this.cur_tps) {
            this.cur_tps = this.max_tps;
        }


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

module.exports = AdaptiveRateController;