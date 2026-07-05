
const path = require('path');
const configEnv = require('./config');

const defaults = {
  host: process.env.HOST || 'mongodb',
  port: process.env.PORT || 8100
};

function getConfig() {
    var config = null;
    switch(process.env.NODE_ENV) {
        case 'development':
            return config = Object.assign({}, defaults, configEnv);
        case 'production':
            return config  = Object.assign({}, defaults, configEnv);
        default:
            return config = Object.assign({}, defaults, configEnv);
    }
};

/**
 * Expose
 */

module.exports = getConfig();
