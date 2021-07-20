require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const cors = require('cors');
const queue = require("./src/queue");
const Faucet = require('./src/faucet');

const FAUCET_PORT = process.env.FAUCET_PORT;

const app = express();
app.use(cors());

const requestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // limit each IP to 3 requests per windowMs
});

app.use(requestLimiter);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const amounts = require("./src/amounts");

const handleRequest = (queueJob) => async (req, res) => {
    const address = req.params.address;
    try {
        const id = await queueJob.add({address});
        return res.json(id);
    } catch (error) {
        return res.json({error: error.message});
    }
};

const checkRequest = (type) => async (req, res, next) => {
    const faucet = new Faucet({requiredBlock: 10, stateFile: "handler_state.json"});
    const userAddress = faucet.getAddress16(req.params.address);
    const block = await faucet.getCurrentBlock();
    const isNotAllowed = faucet.userAlreadyRegistered({
        userAddress,
        block,
        type
    });
    if (isNotAllowed) {
        return res.status(500).json("already requested");
    }
    faucet.appendUserToState({userAddress, block, type});
    faucet.saveState();
    return next();
};


app.get('/tokens/request-funds/:address', checkRequest("tokens"), handleRequest(queue.withdrawTokenJob));
app.get('/zil/request-funds/:address', checkRequest("zil"), handleRequest(queue.withdrawZilJob));

app.get('/amounts', (req, res) => res.json(amounts));


app.listen(FAUCET_PORT, () => console.log(`Faucet listening on port ${FAUCET_PORT}!`));
