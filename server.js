require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const queue = require("./src/queue");

const FAUCET_PORT = process.env.FAUCET_PORT;

const app = express();
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/garb/request-funds/:token_address/:address/:amount', async (req, res) => {
  const address = req.params.address;
  const amount = 10 ** 8 * parseInt(req.params.amount);
  const tokenAddress = req.params.token_address;

  const data = {
    tokenAddress,
    stateFile: "carb_state.json",
    carbPerAccount: 10 ** 8 * 1000,
    carbPerRequest: 10 ** 8 * 100,
    address,
    amount,
  };

  try {
    const id = await queue.withdrawJob.add(data);
    return res.json(id);
  } catch (error) {
    return res.json({ error: error.message });
  }

});

app.get('/xsgd/request-funds/:token_address/:address/:amount', async (req, res) => {
  const address = req.params.address;
  const amount = 10 ** 6 * parseInt(req.params.amount);
  const tokenAddress = req.params.token_address;

  const data = {
    tokenAddress,
    stateFile: "xsgd_state.json",
    carbPerAccount: 10 ** 6 * 25000,
    carbPerRequest: 10 ** 6 * 5000,
    address,
    amount,
  };

  try {
    const id = await queue.withdrawJob.add(data);
    return res.json(id);
  } catch (error) {
    return res.json({ error: error.message });
  }

});


app.post('/zwap/request-funds/:token_address/:address/:amount', async (req, res) => {
  const address = req.params.address;
  const amount = 10 ** 12 * parseInt(req.params.amount);
  const tokenAddress = req.params.token_address;

  const data = {
    tokenAddress,
    stateFile: "zwap_state.json",
    carbPerAccount: 10 ** 12 * 500,
    carbPerRequest: 10 ** 12 * 50,
    address,
    amount,
  };

  try {
    const id = await queue.withdrawJob.add(data);
    return res.json(id);
  } catch (error) {
    return res.json({ error: error.message });
  }

});



app.post('/gzil/request-fund/:token_address/:address/:amount', async (req, res) => {
  const address = req.params.address;
  const amount = 10 ** 15 * parseInt(req.params.amount);
  const tokenAddress = req.params.token_address;

  const data = {
    tokenAddress,
    stateFile: "gzil_state.json",
    carbPerAccount: 10 ** 15 * 1000,
    carbPerRequest: 10 ** 15 * 100,
    address,
    amount,
  };

  try {
    const id = await queue.withdrawJob.add(data);
    return res.json(id);
  } catch (error) {
    return res.json({ error: error.message });
  }


});

app.listen(FAUCET_PORT, () => console.log(`Faucet listening on port ${FAUCET_PORT}!`));
