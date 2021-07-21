require('dotenv').config();

const path = require("path");
const express = require('express');
const csrf = require('csurf');
const csrfProtection = csrf({cookie: true});
const cookieParser = require('cookie-parser');
const hbs = require('express-handlebars');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const queue = require("./src/queue");
const Faucet = require('./src/faucet');

const FAUCET_PORT = process.env.FAUCET_PORT;

const app = express();

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(express.static(path.join(__dirname, 'public')));

const requestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 25 // limit each IP to 3 requests per windowMs
});

app.use(requestLimiter);
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

const amounts = require("./src/amounts");

const handleRequest = (queueJob) => async (req, res) => {
    const address = req.body.address;
    try {
        const id = await queueJob.add({address});
        return res.render("done", {id});
    } catch (error) {
        return res.render("error", {error: error.message});
    }
};

const checkRequest = (type) => async (req, res, next) => {
    const error = "Sorry, that address has already requested funds recently. Please try again later.";
    const faucet = new Faucet({requiredBlock: 10, stateFile: "handler_state.json"});
    const userAddress = faucet.getAddress16(req.body.address);
    if (!userAddress) {
        return res.render("error", {error: "No address entered!"});
    }
    const block = await faucet.getCurrentBlock();
    const isNotAllowed = faucet.userAlreadyRegistered({
        userAddress,
        block,
        type
    });
    if (isNotAllowed) {
        return res.render("error", {error});
    }
    const faucet_state = new Faucet({stateFile: "faucet_state.json"});
    if (faucet_state.userAlreadyRegistered({
        userAddress,
        block,
        type
    })) {
        return res.render("error", {error});
    }
    faucet.appendUserToState({userAddress, block, type});
    faucet.saveState();
    return next();
};


app.post('/tokens/request-funds', csrfProtection, checkRequest("tokens"), handleRequest(queue.withdrawTokenJob));
app.post('/zil/request-funds', csrfProtection, checkRequest("zil"), handleRequest(queue.withdrawZilJob));

app.get('/amounts', (req, res) => res.json(amounts));

app.get('/', csrfProtection, (req, res) => res.render('zil_faucet', {
    title: "$carb-faucet",
    csrfToken: req.csrfToken()
}));
app.get('/zrc2-faucet', csrfProtection, (req, res) => res.render('zrc2_faucet', {
    title: "$carb-faucet",
    csrfToken: req.csrfToken()
}));


app.listen(FAUCET_PORT, () => console.log(`Faucet listening on port ${FAUCET_PORT}!`));
