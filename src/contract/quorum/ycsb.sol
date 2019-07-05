pragma solidity ^0.4.0;
pragma experimental ABIEncoderV2;
contract ycsb {

  mapping(string=>string) store;

  function query(string key) constant returns(string) {
    return store[key];
  }
  function set(string key, string value) {
    store[key] = value;
  }
  function insert(string key, string value) {
    store[key] = value;
  }
  function update(string key, string value) {
    store[key] = value;
  }
  function remove(string key, string value) {
    delete store[key];
  }
  function readmodifywrite(string key, string value) {
    string old_val = store[key];
    store[key] = value;
  }
  function upper(uint num, string[] keys) {
    for (uint i=0; i<num; i++) {
      store[keys[i]] = keys[i+num];
    }
  }

  function _toLower(string str) internal returns (string) {
    return str;
	}
}
