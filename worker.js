const queue = require("./src/queue");
const ZRC2Faucet = require('./src/zrc2_faucet');

console.log(`Start faucent worker`);
queue.withdrawJob.queue.process(async (job) => {
    currentJob = job;
    console.log(`Start sent withdraw transaction ${job.data.uuid}`);
    currentJob = job;
    const { data } = job;
    console.log(data);
    const { tokenAddress, stateFile, carbPerAccount, carbPerRequest, address, amount } = data;
    const faucet = new ZRC2Faucet({
        tokenAddress,
        stateFile,
        carbPerAccount,
        carbPerRequest
    });
    try {
        const date = new Date();
        console.log(`[${date.toUTCString()}] token: ${tokenAddress}  Request funds for ${address}. Amount ${amount}`);
        await faucet.requestFunds(address, amount);
        await faucet.saveState();
    } catch (error) {
        return console.log({ error: error.message });
    } finally {
        await queue.withdrawJob.queue.clean(1000 * 60 * 60 * 24);
        await queue.withdrawJob.queue.clean(1000 * 60 * 60 * 24, 'failed');
    }

});