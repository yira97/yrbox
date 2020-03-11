const program = require('commander');

const prog = new program.Command();

prog
  .version('0.0.1')
  .command('media', '媒体处理', {executableFile: 'lib/media/entry.js'})
  .parse(process.argv);