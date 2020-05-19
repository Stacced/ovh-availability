// Dependencies
const axios = require('axios').default;
const chalk = require('chalk');
const isEqual = require('lodash.isequal');

// Register env variables
require('dotenv').config();

// Add timestamps to logging
require('console-stamp')(console, {
    pattern: 'HH:MM:ss.l',
    label: false
});

// Constants
// Base OVH API endpoint
const baseApi = 'https://www.ovh.com/engine/apiv6/dedicated/server/datacenter/availabilities';
// Discord webhook URL
const webhookUrl = process.env.WEBHOOK_URL;

// Default params for requests
const defaultParams = { excludeDatacenters: false };
const defaultWebhookParams = {
    username: "OVH Availability",
    avatar_url: "https://avatars0.githubusercontent.com/u/1698434?s=280&v=4",
}

// Custom Axios instance for OVH API
const axiosInstance = axios.create({
    baseURL: baseApi,
    timeout: 5000,
    method: "GET",
})

// Watched configs
const watchedConfigs = [
    { planCode: '20game01', server: '20game01' },
    { planCode: '20game02', server: '20game02' },
    { planCode: '19game01-sgp', server: '19game01-apac' },
    { planCode: '19game02-sgp', server: '19game02-apac' },
    { planCode: '20game03', server: '20game03' },
];

// Cache object
const watchedConfigsCache = [];

// Endpoint check loop
setInterval(async () => {
    logImportant('Sending requests to OVH API...');
    watchedConfigs.forEach(config => {
        axiosInstance.get('/', {
            params: { ...defaultParams, ...config }
        })
            .then(response => {
                // Log response arrival
                logInfo(`Received response for ${config.planCode}`);
                // Check if config data is cached
                if (watchedConfigsCache[config.planCode] !== undefined) {
                    // Check if current response is the same as cache for each config
                    for (let i = 0; i < watchedConfigsCache[config.planCode].length; i++) {
                        // Deep comparison of objects using Lodash function
                        if (!isEqual(watchedConfigsCache[config.planCode][i].datacenters, response.data[i].datacenters)) {
                            // Log updated availabilities event
                            logImportant(`${config.planCode} datacenters have been updated`);
                            logImportant(JSON.stringify(watchedConfigsCache[config.planCode][i].datacenters));
                            logImportant(JSON.stringify(response.data[i].datacenters));

                            // Send alert thru Discord webhook
                            const webhookParams = {
                                ...defaultWebhookParams,
                                content: `**New availability detected for config ${config.planCode}**`,
                                embeds: [
                                    {
                                        title: "Current availabilities",
                                        description: "```json\n" + JSON.stringify(response.data[i].datacenters, null, "\t") + "\n```"
                                    }
                                ]
                            }
                            logImportant('Sending alert to Discord webhook');
                            axios.post(webhookUrl, webhookParams).catch(logError);

                            // Update cache
                            logImportant('Updating cache.');
                            watchedConfigsCache[config.planCode] = response.data;
                        } else {
                            logInfo(`No change detected for ${config.planCode} with config ${response.data[i].fqn}`);
                        }
                    }
                } else {
                    // Add to cache
                    watchedConfigsCache[config.planCode] = response.data
                    logInfo(`Added ${config.planCode} with ${config.server} to cache`);
                }
            })
            .catch(logError);
    })
    logImportant('Requests sent to API.');
}, 10000);

/**
 * Pretty prints INFO log
 * @param msg
 */
function logInfo(msg) {
    console.log('%s %s', chalk.cyan('INFO'), msg);
}

/**
 * Pretty prints important log
 * @param msg
 */
function logImportant(msg) {
    console.log('%s %s', chalk.redBright('/!\\'), msg);
}

/**
 * Pretty prints ERR log
 * @param msg
 */
function logError(msg) {
    console.error('%s %s', chalk.bgRed(chalk.white('ERR')), msg);
}