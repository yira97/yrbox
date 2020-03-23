const program = require('commander');
const lib = require('../lib/file');

const prog = new program.Command();
prog
  .command('findup')
  .description('查找目录下所有重复的文件')
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .action(param => {
    find_dup_in_dir(param.dir, param.recursive);
  });

async function find_dup_in_dir(root, recursive) {
}
