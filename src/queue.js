const {v4: uuid} = require('uuid');
const Queue = require('bull');
const Redis = require('ioredis')
const redisUrl = process.env.REDIS_URL;
const {jobType} = require('./constants');
const redis = new Redis(redisUrl);
const withdrawJob = new Queue(jobType.WITHDRAW, redisUrl, {
    lockDuration: 300000, // Key expiration time for job locks.
    lockRenewTime: 30000, // Interval on which to acquire the job lock
    stalledInterval: 30000, // How often check for stalled jobs (use 0 for never checking).
    maxStalledCount: 3, // Max amount of times a stalled job will be re-processed.
    guardInterval: 5000, // Poll interval for delayed jobs and added jobs.
    retryProcessDelay: 5000, // delay before processing next job in case of internal error.
    drainDelay: 5, // A timeout for when the queue is in drained state (empty waiting for jobs).
});

module.exports = Object.freeze({
    withdrawJob: {
        add: async (data) => {
            const id = uuid();
            data.uuid = id;
            data.createAt = new Date().toISOString();
            const job = await withdrawJob.add(data);
            await redis.set(`job:${id}`, job.id);
            return id;
        },
        getStatus: async (uuid) => {
            const id = await redis.get(`job:${uuid}`);
            if (!id) {
                return null;
            }
            const job = await withdrawJob.getJobFromId(id);
            if (!job) {
                return null
            }
            return {
                ...job.data,
                failedReason: job.failedReason,
            };
        },
        queue: withdrawJob,
    }
});
