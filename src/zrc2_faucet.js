require('dotenv').config();

const { BN, Long, bytes } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const fs = require('fs-extra');



// const BLOCKS_TO_WAIT = process.env.BLOCKS_TO_WAIT;
const OWNER_PRIVATEKEY = process.env.OWNER_PRIVATEKEY;
const ISOLATED_URL = process.env.ISOLATED_URL;

class Faucet {
  constructor({ tokenAddress, stateFile, carbPerAccount, carbPerRequest }) {
    this.tokenAddress = tokenAddress;
    this.stateFile = stateFile;
    this.carbPerAccount = carbPerAccount;
    this.carbPerRequest = carbPerRequest;
    this.chainId = 333; // chainId of the developer testnet
    this.msgVersion = 1; // current msgVersion
    this.VERSION = bytes.pack(this.chainId, this.msgVersion);
    this.state = [];
    this.getState();

    this.zilliqa = new Zilliqa(ISOLATED_URL);
    this.zilliqa.wallet.addByPrivateKey(OWNER_PRIVATEKEY);
  }

  getState() {
    if (!fs.existsSync('./' + this.stateFile)) {
      console.log('Generating state file');
      fs.writeJSONSync('./' + this.stateFile, [
        {
          address: 'init',
          block: 0
        }
      ]);
    }

    const stateFile = fs.readJSONSync('./' + this.stateFile);
    this.state = stateFile;

    return this.state;
  }

  saveState() {
    fs.writeJSONSync('./' + this.stateFile, this.state);
  }

  userAlreadyRegistered(userAddress) {
    return this.state.findIndex((item) => item.address === userAddress) !== -1;
  }

  appendUserToState({ userAddress, block }) {
    this.state.push({ address: userAddress, block });
  }

  async registerUser(userAddress) {
    if (this.userAlreadyRegistered(userAddress)) {
      throw new Error('Address already requested funds.');
    }

    const gasPrice = await this.zilliqa.blockchain.getMinimumGasPrice();
    const myGasPrice = gasPrice.result;

    const tx = this.zilliqa.transactions.new({
      version: this.VERSION,
      toAddr: userAddress,
      amount: new BN(this.carbPerAccount),
      gasPrice: new BN(myGasPrice), // in Qa
      gasLimit: Long.fromNumber(8000)
    });

    const callTx = await this.zilliqa.blockchain.createTransaction(tx);

    if (callTx.receipt.success) {
      this.appendUserToState({ userAddress, block: callTx.receipt.epoch_num });
    }

    return callTx.receipt;
  }

  async requestFunds(userAddress, amount = this.carbPerRequest) {
    if (this.userAlreadyRegistered(userAddress)) {
      throw new Error('Address already requested funds.');
    }

    const gasPrice = await this.zilliqa.blockchain.getMinimumGasPrice();
    const myGasPrice = gasPrice.result;

    const contract = this.zilliqa.contracts.at(this.tokenAddress);

    const callTx = await contract.callWithoutConfirm(
      "Transfer",
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: userAddress.toString(),
        },
        {
          vname: 'amount',
          type: 'Uint128',
          value: amount.toString(),
        },
      ],
      {
        // amount, gasPrice and gasLimit must be explicitly provided
        version: this.VERSION,
        amount: new BN(0),
        gasPrice: new BN(myGasPrice), // in Qa
        gasLimit: Long.fromNumber(8000)
      },
      true,
    );

    const confirmedTxn = await callTx.confirm(callTx.id);

    if (confirmedTxn.receipt.success) {
      this.appendUserToState({ userAddress, block: callTx.receipt.epoch_num });
    }

    return callTx.receipt;
  }
}

module.exports = Faucet;
