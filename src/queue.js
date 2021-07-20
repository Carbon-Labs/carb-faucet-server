const {v4: uuid} = require('uuid');
const Queue = require('bull');
const Redis = require('ioredis')
const redisUrl = process.env.REDIS_URL;
const {jobType} = require('./constants');
const redis = new Redis(redisUrl);
const withdrawTokenJob = new Queue(jobType.WITHDRAW_TOKENS, redisUrl, {
    lockDuration: 300000, // Key expiration time for job locks.
    lockRenewTime: 30000, // Interval on which to acquire the job lock
    stalledInterval: 30000, // How often check for stalled jobs (use 0 for never checking).
    maxStalledCount: 3, // Max amount of times a stalled job will be re-processed.
    guardInterval: 5000, // Poll interval for delayed jobs and added jobs.
    retryProcessDelay: 5000, // delay before processing next job in case of internal error.
    drainDelay: 5, // A timeout for when the queue is in drained state (empty waiting for jobs).
});

const withdrawZilJob = new Queue(jobType.WITHDRAW_ZIL, redisUrl, {
    lockDuration: 300000, // Key expiration time for job locks.
    lockRenewTime: 30000, // Interval on which to acquire the job lock
    stalledInterval: 30000, // How often check for stalled jobs (use 0 for never checking).
    maxStalledCount: 3, // Max amount of times a stalled job will be re-processed.
    guardInterval: 5000, // Poll interval for delayed jobs and added jobs.
    retryProcessDelay: 5000, // delay before processing next job in case of internal error.
    drainDelay: 5, // A timeout for when the queue is in drained state (empty waiting for jobs).
});

module.exports = Object.freeze({
    withdrawTokenJob: {
        add: async (data) => {
            const id = uuid();
            data.uuid = id;
            data.createAt = new Date().toISOString();
            const job = await withdrawTokenJob.add(data);
            await redis.set(`job:${id}`, job.id);
            return id;
        },
        getStatus: async (uuid) => {
            const id = await redis.get(`job:${uuid}`);
            if (!id) {
                return null;
            }
            const job = await withdrawTokenJob.getJobFromId(id);
            if (!job) {
                return null
            }
            return {
                ...job.data,
                failedReason: job.failedReason,
            };
        },
        queue: withdrawTokenJob,
    },
    withdrawZilJob: {
        add: async (data) => {
            const id = uuid();
            data.uuid = id;
            data.createAt = new Date().toISOString();
            const job = await withdrawZilJob.add(data);
            await redis.set(`job:${id}`, job.id);
            return id;
        },
        getStatus: async (uuid) => {
            const id = await redis.get(`job:${uuid}`);
            if (!id) {
                return null;
            }
            const job = await withdrawZilJob.getJobFromId(id);
            if (!job) {
                return null
            }
            return {
                ...job.data,
                failedReason: job.failedReason,
            };
        },
        queue: withdrawZilJob,
    }
});
