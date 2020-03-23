const program = require('commander');
const { find_all_file_recursive, find_all_file, get_file_md5 } = require('../lib/file');
const chalk = require('chalk');

const prog = new program.Command();
prog
  .command('findup')
  .description('查找目录下所有重复的文件')
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .action(param => {
    find_dup_in_dir(param.dir, param.recursive);
  });

prog.parse(process.argv);

/**
 * @param {string} root 起点
 * @param {boolean} recursive 是否递归子目录
 */
async function find_dup_in_dir(root, recursive) {
  const get_file = recursive ? find_all_file_recursive : find_all_file;
  // md5 string -> file path set
  const hash_file_dict = new Map();
  let files = await get_file(root).catch(err => {
    console.log(chalk.redBright(err));
  });
  for (const file of files) {
    const hash = await get_file_md5(file);
    const file_set = hash_file_dict.get(hash);
    if (file_set) {
      file_set.add(file);
    } else {
      const new_file_set = new Set();
      new_file_set.add(file);
      hash_file_dict.set(hash, new_file_set);
    }
  }
  let dup_count = 0;
  hash_file_dict.forEach((file_set) => {
    if (file_set.size > 1) {
      dup_count++;
      console.log(file_set);
    }
  });
  console.log(`一共有 ${dup_count} / ${files.length} 组重复文件`);
}
