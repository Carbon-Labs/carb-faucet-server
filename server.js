require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const queue = require("./src/queue");

const FAUCET_PORT = process.env.FAUCET_PORT;

const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const handleRequest = ({stateFile, carbPerAccount, carbPerRequest, decimals}) => async (req, res) => {
    const address = req.params.address;
    const amount = 10 ** decimals * parseInt(req.params.amount);
    const tokenAddress = req.params.token_address;

    try {
        const id = await queue.withdrawJob.add({
            tokenAddress,
            stateFile,
            carbPerAccount,
            carbPerRequest,
            address,
            amount,
        });
        return res.json(id);
    } catch (error) {
        return res.json({error: error.message});
    }
};

const amounts = {
    carb: {
        decimals: 8,
        perAccount: 1000,
        perRequest: 100
    },
    xsgd: {
        decimals: 6,
        perAccount: 25000,
        perRequest: 5000
    },
    zwap: {
        decimals: 12,
        perAccount: 500,
        perRequest: 50
    },
    gzil: {
        decimals: 15,
        perAccount: 500,
        perRequest: 50
    },
};

app.get('/carb/request-funds/:token_address/:address/:amount', handleRequest({
    decimals: amounts.carb.decimals,
    carbPerAccount: 10 ** amounts.carb.decimals * amounts.carb.perAccount,
    carbPerRequest: 10 ** amounts.carb.decimals * amounts.carb.perRequest,
    stateFile: "carb_state.json"
}));


app.get('/xsgd/request-funds/:token_address/:address/:amount', handleRequest({
    decimals: amounts.xsgd.decimals,
    carbPerAccount: 10 ** amounts.xsgd.decimals * amounts.xsgd.perAccount,
    carbPerRequest: 10 ** amounts.xsgd.decimals * amounts.xsgd.perRequest,
    stateFile: "xsgd_state.json",
}));


app.post('/zwap/request-funds/:token_address/:address/:amount', handleRequest({
    decimals: amounts.zwap.decimals,
    carbPerAccount: 10 ** amounts.zwap.decimals * amounts.zwap.perAccount,
    carbPerRequest: 10 ** amounts.zwap.decimals * amounts.zwap.perRequest,
    stateFile: "zwap_state.json",
}));


app.post('/gzil/request-fund/:token_address/:address/:amount', handleRequest({
    decimals: amounts.gzil.decimals,
    carbPerAccount: 10 ** amounts.gzil.decimals * amounts.gzil.perAccount,
    carbPerRequest: 10 ** amounts.gzil.decimals * amounts.gzil.perRequest,
    stateFile: "gzil_state.json",
}));

app.get('/amounts', (req, res) => res.json(amounts));


app.listen(FAUCET_PORT, () => console.log(`Faucet listening on port ${FAUCET_PORT}!`));
