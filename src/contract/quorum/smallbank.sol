pragma solidity ^0.4.0;
pragma experimental ABIEncoderV2;

contract smallbank {
    
    mapping(string=>uint) savingStore;
    mapping(string=>uint) checkingStore;

    function create_account(string accID, string name, uint checking, uint saving) public {
      checkingStore[accID] = checking;
      savingStore[accID] = saving;
    }

    function amalgamate(string arg0, string arg1) public {
       uint bal1 = checkingStore[arg0];
       uint bal2 = savingStore[arg1];

       checkingStore[arg0] = bal1 + bal2;
       savingStore[arg1] = 0;
    }

    function query(string arg0) public constant returns (uint balance) {
        uint bal1 = savingStore[arg0];
        uint bal2 = checkingStore[arg0];
        
        balance = bal1 + bal2;
        return balance;
    }
    
    function deposit_checking(uint arg0, string arg1) public {
        uint bal1 = arg0;
        uint bal2 = checkingStore[arg1];
        
        checkingStore[arg1] = bal1 + bal2;
    }
    
    function transact_savings(uint arg0, string arg1) public {
        uint bal1 = savingStore[arg1];
        uint bal2 = arg0;
        
        savingStore[arg1] = bal1 + bal2;
    }
    
    function send_payment(uint arg0, string arg1, string arg2) public {
        uint amount = arg0;
        uint bal1 = checkingStore[arg1];
        uint bal2 = checkingStore[arg2];
        
        bal1 += amount;
        bal2 -= amount;
        
        checkingStore[arg1] = bal1;
        checkingStore[arg2] = bal2;
    }
    
    function write_check(uint arg0, string arg1) public {
        uint amount = arg0;
        uint bal1 = checkingStore[arg1];
        checkingStore[arg1] = bal1 - amount;
    }
}