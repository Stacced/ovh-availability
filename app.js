// Dependencies
const axios = require('axios').default;
const chalk = require('chalk');
const isEqual = require('lodash.isequal');

// Add timestamps to logging
require('console-stamp')(console, {
    pattern: 'HH:MM:ss.l',
    label: false
});

// Constants
// Base OVH API endpoint
const baseApi = 'https://www.ovh.com/engine/apiv6/dedicated/server/datacenter/availabilities';
const defaultParams = { excludeDatacenters: false };

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

function printResponseData(response) {
    console.debug(response.data);
}

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
                            // Alert user and update cache accordingly
                            logImportant(`${config.planCode} datacenters have been updated`);
                            logImportant(watchedConfigsCache[config.planCode][i].datacenters);
                            logImportant(response.data[i].datacenters);
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

function logInfo(msg) {
    console.log('%s %s', chalk.cyan('INFO'), msg);
}

function logImportant(msg) {
    console.log('%s %s', chalk.redBright('/!\\'), msg);
}

function logError(msg) {
    console.error('%s %s', chalk.bgRed(chalk.white('ERR')), msg);
}