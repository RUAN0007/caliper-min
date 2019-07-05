/**
 * Modifications Copyright 2017 HUAWEI
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

'use strict';

//const utils = require('fabric-client/lib/utils.js');
//const logger = utils.getLogger('E2E join-channel');

//const tape = require('tape');
//const _test = require('tape-promise');
//const test = _test(tape);

//const util = require('util');
const fs = require('fs');

const Client = require('fabric-client');
// const EventHub = require('fabric-client/lib/EventHub.js');

const testUtil = require('./util.js');
const commUtils = require('../comm/util');

//let the_user = null;
let tx_id = null;
let ORGS;


/**
 * Join the peers of the given organization to the given channel.
 * @param {string} org The name of the organization.
 * @param {string} channelName The name of the channel.
 * @return {Promise} The return promise.
 */
function joinChannel(org, channelName) {
    const client = new Client();
    const channel = client.newChannel(channelName);

    const orgName = ORGS[org].name;

    const targets = [], eventhubs = [];

    const caRootsPath = ORGS.orderers[0].tls_cacerts;
    let data = fs.readFileSync(commUtils.resolvePath(caRootsPath));
    let caroots = Buffer.from(data).toString();
    let genesis_block = null;

    channel.addOrderer(
        client.newOrderer(
            ORGS.orderers[0].url,
            {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderers[0]['server-hostname']
            }
        )
    );

    return Client.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(orgName)
    }).then((store) => {
        client.setStateStore(store);

        return testUtil.getOrderAdminSubmitter(client);
    }).then((admin) => {
        tx_id = client.newTransactionID();
        let request = {
            txId : tx_id
        };

        return channel.getGenesisBlock(request);
    }).then((block) =>{
        genesis_block = block;

        // get the peer org's admin required to send join channel requests
        client._userContext = null;

        return testUtil.getSubmitter(client, true /* get peer org admin */, org);
    }).then((admin) => {
        //the_user = admin;
        for (let key in ORGS[org]) {
            if (ORGS[org].hasOwnProperty(key)) {
                if(key.indexOf('peer') === 0) {
                       
                    data = fs.readFileSync(commUtils.resolvePath(ORGS[org][key].tls_cacerts));
                    targets.push(client.newPeer(
                            ORGS[org][key].requests,
                            {
                                pem: Buffer.from(data).toString(),
                                'ssl-target-name-override': ORGS[org][key]['server-hostname']
                            }
                        )
                    );
                }
            }
        }
        var promises = [];
        promises.push(new Promise(resolve => setTimeout(resolve, 10000)));

        tx_id = client.newTransactionID(true);
        let request = {
            targets : targets,
            block : genesis_block,
            txId : tx_id
        };
        let sendPromise = channel.joinChannel(request);
        promises.push(sendPromise);
        return Promise.all(promises);
    }).then((results) => {
        let peers_results = results.pop();
        for(let i in peers_results) {
            let peer_result = peers_results[i];
            if(peer_result.response && peer_result.response.status == 200) {
                // commUtils.log('Successfully joined peer from ', orgName, ' to the channel ',channelName);
            } else {
                throw new Error('Failed to join peer to the channel ' + channelName + 
                                "with peer result " + peer_result +
                                 " with peer response msg" + peer_result.response + " and status " + peer_result.response.status);
            }
        }
    }).catch((err)=>{
        // disconnect(eventhubs);

        return Promise.reject(err);
    });
}

module.exports.run = function (config_path) {
    Client.addConfigFile(config_path);
    const fabric = Client.getConfigSetting('fabric');
    let channels = fabric.channel;
    if(!channels || channels.length === 0) {
        return Promise.resolve();
    }
    ORGS = Client.getConfigSetting('fabric').network;
    return new Promise(function(resolve, reject) {
        const t = global.tapeObj;
        t.comment('Join channel......');

        return channels.reduce((prev, channel)=>{
            return prev.then(() => {
                if(channel.deployed) {
                    return Promise.resolve();
                }

                t.comment('join ' + channel.name);

                // Join channel serially
                // return channel.organizations.reduce((prev, org)=>{
                //     return prev.then(()=>{
                //         return joinChannel(org, channel.name)
                //           .catch((err)=>{
                //             t.fail("HERE: fail to join " + org + ", " + err);
                //           });
                //     });
                // }, Promise.resolve());

                // Join channel concurrently
                let promises = [];
                channel.organizations.forEach((org, index) => {
                    promises.push(joinChannel(org, channel.name));
                });
                return Promise.all(promises).then(()=>{
                    t.pass('Successfully joined ' + channel.name);
                    return Promise.resolve();
                });
            });
        }, Promise.resolve())
            .then(() => {
                return resolve();
            })
            .catch((err)=>{
                t.fail('Failed to join peers, ' + err);
                return reject(new Error('Fabric: Join channel failed'));
            });
    });
};

