#!/usr/bin/env node

const program = require('commander');

const prog = new program.Command();

prog
  .version('0.0.1')
  .command('media', '媒体处理', { executableFile: `${__dirname}/../bin/media.js` })
  .command('routine', '日常工作', { executableFile: `${__dirname}/../bin/routine.js` })
  .command('file', '文件处理', { executableFile: `${__dirname}/../bin/file.js` })
  .parse(process.argv);
