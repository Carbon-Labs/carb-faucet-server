require('dotenv').config();

const {BN, Long, bytes, units} = require('@zilliqa-js/util');
const {Zilliqa} = require('@zilliqa-js/zilliqa');
const {getAddressFromPrivateKey, normaliseAddress} = require('@zilliqa-js/crypto');
const fs = require('fs-extra');


const ZIL_PRIVATE_KEY = process.env.ZIL_PRIVATEKEY;
const OWNER_PRIVATEKEY = process.env.OWNER_PRIVATEKEY;
const ISOLATED_URL = process.env.ISOLATED_URL;

const getAddress16 = (address) => {
    try {
        return normaliseAddress(address);
    } catch (e) {
        return address;
    }
}

class Faucet {
    constructor({tokens = [], zil, requiredBlock = 2500, stateFile = "faucet_state.json"}) {
        this.tokens = tokens;
        this.zil = zil;
        this.requiredBlock = requiredBlock;
        this.chainId = 333; // chainId of the developer testnet
        this.msgVersion = 1; // current msgVersion
        this.VERSION = bytes.pack(this.chainId, this.msgVersion);
        this.state = [];
        this.zilliqaTokens = new Zilliqa(ISOLATED_URL);
        this.zilliqaTokens.wallet.addByPrivateKey(OWNER_PRIVATEKEY);
        this.zilliqaZil = new Zilliqa(ISOLATED_URL);
        this.zilliqaZil.wallet.addByPrivateKey(ZIL_PRIVATE_KEY);
        this.stateFile = stateFile;
        this.getState();
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
        this.state = fs.readJSONSync('./' + this.stateFile);
        return this.state;
    }

    saveState() {
        fs.writeJSONSync('./' + this.stateFile, this.state);
    }

    userAlreadyRegistered({userAddress, block, type}) {
        const item = this.state.find((item) => item.address.toLowerCase() === userAddress.toLowerCase());
        return item && item.block + this.requiredBlock >= block && item.type === type;
    }

    appendUserToState({userAddress, block, type}) {
        this.state = this.state.filter(state => state.address.toLowerCase() !== userAddress.toLowerCase() && state.type === type);
        this.state.push({address: userAddress, block: parseInt(block), type});
    }

    removeUserState({userAddress, type}) {
        this.state = this.state.filter(state => state.address.toLowerCase() !== userAddress.toLowerCase() && state.type === type);
    }

    async getCurrentBlock() {
        const {result} = await this.zilliqaTokens.blockchain.getNumTxBlocks();
        return parseInt(result);
    }

    getAddress16(address) {
        return getAddress16(address);
    }

    async requestTokenFunds(userAddress) {
        userAddress = getAddress16(userAddress);
        if (this.userAlreadyRegistered({userAddress, block: await this.getCurrentBlock(), type: "tokens"})) {
            throw new Error('Address already requested funds.');
        }
        this.removeUserState({userAddress, type: "tokens"});
        const gasPrice = await this.zilliqaTokens.blockchain.getMinimumGasPrice();
        const myGasPrice = gasPrice.result;
        const address = getAddressFromPrivateKey(OWNER_PRIVATEKEY);
        const balance = await this.zilliqaTokens.blockchain.getBalance(address);
        let block = 0;

        await Promise.all(this.tokens.map(async (token, index) => {
            const contract = this.zilliqaTokens.contracts.at(token.tokenAddress);
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
                        value: (10 ** token.decimals * token.perRequest).toString(),
                    },
                ],
                {
                    // amount, gasPrice and gasLimit must be explicitly provided
                    version: this.VERSION,
                    amount: new BN(0),
                    gasPrice: new BN(myGasPrice), // in Qa
                    gasLimit: Long.fromNumber(8000),
                    nonce: parseInt(balance.result.nonce) + index + 1,
                },
                true,
            );
            if (!callTx.id) {
                return;
            }

            console.log("start transaction: ", "0x" + callTx.id);

            const confirmedTxn = await callTx.confirm(callTx.id);

            if (confirmedTxn.receipt.success) {
                block = callTx.receipt.epoch_num;
            }

            return callTx.receipt;
        }));

        if (block > 0) {
            this.appendUserToState({userAddress, block, type: "tokens"});
            console.log("end transaction: ", "0x" + callTx.id);
        }

    }

    async requestZilFunds(userAddress) {
        userAddress = getAddress16(userAddress);
        const block = await this.getCurrentBlock();
        if (this.userAlreadyRegistered({userAddress, block, type: "zil"})) {
            throw new Error('Address already requested funds.');
        }
        this.removeUserState({userAddress, type: "zil"});
        const gasPrice = await this.zilliqaZil.blockchain.getMinimumGasPrice();
        const myGasPrice = gasPrice.result;

        const tx = this.zilliqaZil.transactions.new(
            {
                // amount, gasPrice and gasLimit must be explicitly provided
                version: this.VERSION,
                toAddr: userAddress,
                amount: new BN(units.toQa(this.zil.perRequest.toString(), units.Units.Zil)),
                gasPrice: new BN(myGasPrice), // in Qa
                gasLimit: Long.fromNumber(8000),
            },
            true,
        );

        const callTx = await this.zilliqaZil.blockchain.createTransaction(tx);

        if (!callTx.id) {
            return;
        }

        console.log("start transaction: ", "0x" + callTx.id);

        if (callTx.receipt.success) {
            this.appendUserToState({userAddress, block: parseInt(callTx.receipt.epoch_num), type: "zil"});
            console.log("end transaction: ", "0x" + callTx.id);
        }
        return callTx.receipt;
    }

}

module.exports = Faucet;
