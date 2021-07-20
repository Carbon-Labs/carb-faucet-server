const queue = require("./src/queue");
const Faucet = require('./src/faucet');
const amounts = require("./src/amounts");
const tokens = amounts.filter(({currency}) => currency !== "zil");
const zil = amounts.find(({currency}) => currency === "zil");

console.log(`Start faucent worker`);
queue.withdrawTokenJob.queue.process(async (job) => {
    console.log(`Start sent withdraw transaction ${job.data.uuid}`);
    const {data} = job;
    const {address} = data;
    const faucet = new Faucet({tokens});
    try {
        const date = new Date();
        console.log(`[${date.toUTCString()}] Request tokens funds for ${address}`);
        await faucet.requestTokenFunds(address);
        await faucet.saveState();
    } catch (error) {
        return console.log({error: error.message});
    } finally {
        await queue.withdrawTokenJob.queue.clean(1000 * 60 * 60 * 24);
        await queue.withdrawTokenJob.queue.clean(1000 * 60 * 60 * 24, 'failed');
    }
});

queue.withdrawZilJob.queue.process(async (job) => {
    console.log(`Start sent withdraw transaction ${job.data.uuid}`);
    try {
        const {data} = job;
        const {address} = data;
        const faucet = new Faucet({zil});
        const date = new Date();
        console.log(`[${date.toUTCString()}] Request zil funds for ${address}`);
        await faucet.requestZilFunds(address);
        await faucet.saveState();
    } catch (error) {
        return console.log({error: error.message});
    } finally {
        await queue.withdrawZilJob.queue.clean(1000 * 60 * 60 * 24);
        await queue.withdrawZilJob.queue.clean(1000 * 60 * 60 * 24, 'failed');
    }
});