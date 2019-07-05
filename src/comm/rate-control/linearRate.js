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

/**
 * Rate controller for generating a linearly changing workload.
 *
 * @property {Blockchain} blockchain The initialized blockchain object.
 * @property {object} options The user-supplied options for the controller.
 * @property {number} startingSleepTime The sleep time for the first transaction in milliseconds.
 * @property {number} gradient The gradient of the line.
 */
class LinearRateController extends RateInterface{
    /**
     * Creates a new instance of the {LinearRateController} class.
     * @constructor
     * @param {Blockchain} blockchain The initialized blockchain object.
     * @param {object} opts Options for the rate controller.
     */
    constructor(blockchain, opts) {
        super(blockchain, opts);
    }

    /**
     * Initializes the rate controller.
     *
     * @param {object} msg Client options with adjusted per-client load settings.
     * @param {string} msg.type The type of the message. Currently always 'test'
     * @param {string} msg.label The label of the round.
     * @param {object} msg.rateControl The rate control to use for the round.
     * @param {number} msg.trim The number/seconds of transactions to trim from the results.
     * @param {object} msg.args The user supplied arguments for the round.
     * @param {string} msg.cb The path of the user's callback module.
     * @param {string} msg.config The path of the network's configuration file.
     * @param {number} msg.numb The number of transactions to generate during the round.
     * @param {number} msg.txDuration The length of the round in SECONDS.
     * @param {number} msg.totalClients The number of clients executing the round.
     * @param {number} msg.clients The number of clients executing the round.
     * @param {object} msg.clientargs Arguments for the client.
     * @param {number} msg.clientIdx The 0-based index of the current client.
     * @param {number} msg.roundIdx The 1-based index of the current round.
     */
    async init(msg) {
        // distributing TPS among clients
        let startingTps = Number(this.options.startingTps) / msg.totalClients;
        let finishingTps = Number(this.options.finishingTps) / msg.totalClients;
        this.startingSleepTime = 1000 / startingTps;
        let finishingSleepTime = 1000 / finishingTps;

        // based on linear interpolation between two points with (time/index, sleep time) axes
        let duration = msg.numb? msg.numb : msg.txDuration * 1000;
        this.gradient = (finishingSleepTime - this.startingSleepTime) / duration;

        // to avoid constant if/else check with the same result
        this._interpolate = msg.numb ? this._interpolateFromIndex : this._interpolateFromTime;
    }

    /**
     * Perform the rate control by sleeping through the round.
     * @param {number} start The epoch time at the start of the round (ms precision).
     * @param {number} idx Sequence number of the current transaction.
     * @param {object[]} currentResults The list of results of finished transactions.
     * @return {Promise} A promise that will resolve after the necessary time to keep the defined Tx rate.
     */
    async applyRateControl(start, idx, currentResults) {
        let currentSleepTime = this._interpolate(start, idx);
        return currentSleepTime > 5 ? util.sleep(currentSleepTime) : Promise.resolve();
    }

    /**
     * Interpolates the current sleep time from the transaction index.
     * @param {number} start The epoch time at the start of the round (ms precision).
     * @param {number} idx Sequence number of the current transaction.
     * @return {number} The interpolated sleep time.
     * @private
     */
    _interpolateFromIndex(start, idx) {
        return this.startingSleepTime + idx * this.gradient;
    }

    /**
     * Interpolates the current sleep time from the elapsed time.
     * @param {number} start The epoch time at the start of the round (ms precision).
     * @param {number} idx Sequence number of the current transaction.
     * @return {number} The interpolated sleep time.
     * @private
     */
    _interpolateFromTime(start, idx) {
        return this.startingSleepTime + (Date.now() - start) * this.gradient;
    }
}

module.exports = LinearRateController;