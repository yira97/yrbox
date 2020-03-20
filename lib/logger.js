const path = require('path');
const log4js = require('log4js');

// 项目根目录下的log文件夹中
const logFilePath = path.join(__dirname, '../log/global.log');

log4js.configure({
  appenders: {
    global: {
      type: 'file',
      filename: logFilePath,
    },
    console: {
      type: 'stdout',
    },
  },
  categories: {
    default: {
      appenders: ['global', 'console'],
      level: 'info',
    },
    media: {
      appenders: ['global'],
      level: 'info',
    },
    mediaCli: {
      appenders: ['global', 'console'],
      level: 'info',
    },
    routine: {
      appenders: ['global'],
      level: 'info',
    },
    routineCli: {
      appenders: ['global', 'console'],
      level: 'info',
    }
  },
});

const mediaLogger = log4js.getLogger('media');
const mediaCliLogger = log4js.getLogger('mediaCli');
const routineLogger = log4js.getLogger('routine');
const routineCliLogger = log4js.getLogger('routineCli');

module.exports = {
  mediaLogger: mediaLogger,
  mediaCli: mediaCliLogger,
  routineLogger: routineLogger,
  routineCli: routineCliLogger,
};

