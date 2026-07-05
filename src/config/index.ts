
const path = require('path');
import { config as configEnv } from './config'

const defaults = {
  host: process.env.HOST || 'mongodb',
  port: process.env.PORT || 8100
};

export function getConfig() {
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