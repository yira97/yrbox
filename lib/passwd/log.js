const log4js = require('log4js');
const path = require('path');
const config = require('./config');
log4js.configure({
  appenders: {
    logfile: {
      type: 'file',
      filename: path.join(__dirname, config.log.path),
    },
    console: {
      type: 'stdout',
    },
  },
  categories: {
    sequelize: {
      appenders: ['logfile'],
      level: 'info',
    },
    koa: {
      appenders: ['console', 'logfile'],
      level: 'info',
    },
    default: {
      appenders: ['console', 'logfile'],
      level: 'info',
    }
  }
});

const app_logger = log4js.getLogger('koa');
const db_logger = log4js.getLogger('sequelize');

module.exports = {
  appLoger: app_logger,
  dbLoger: db_logger,
};

