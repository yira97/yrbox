const program = require('commander');
const { find_all_file_recursive, find_all_file, get_file_md5, get_file_size, encrypt_directory_filename, decrypt_directory_filename } = require('../lib/file');
const { parse_file_size_text, get_proper_size_str } = require('../lib/scale');
const chalk = require('chalk');
const { temp, fileCmdLogger } = require('../lib/logger');
const shell = require('shelljs');

const prog = new program.Command();
prog
  .command('findup')
  .description('查找目录下所有重复的文件')
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--minsize <size>', '设置查找对象的最小体积', '0m')
  .action(param => {
    const byte = parse_file_size_text(param.minsize);
    find_dup_in_dir(param.dir, param.recursive, byte);
  });

prog
  .command('encpd')
  .description('加密文件名')
  .requiredOption('-d --dir <path>', '起点目录')
  .requiredOption('-s --secret <secret>', '密钥')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--suffix <suffix>', '加密后缀名', '.enc')
  .action(param => {
    encrypt_filename_cmd(param.dir, param.recursive, param.secret, param.suffix);
  });

prog
  .command('decpd')
  .description('解密文件名')
  .requiredOption('-d --dir <path>', '起点目录')
  .requiredOption('-s --secret <secret>', '密钥')
  .requiredOption('--iv <iv>', '附加密钥')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--suffix <suffix>', '加密后缀名', '.enc')
  .action(param => {
    decrypt_filename_cmd(param.dir, param.recursive, param.secret, param.iv, param.suffix);
  });

prog.parse(process.argv);

async function decrypt_filename_cmd(root, recursive, secret, iv, suffix) {
  const decrypts = await decrypt_directory_filename(root, recursive, secret, iv, suffix);
  temp.info(`解密成功. 一共 ${decrypts.length} 个文件.`);
  decrypts.forEach(f => {
    temp.info(f);
  });
}

/**
 * @param {string} root 起点
 * @param {boolean} recursive 是否递归
 * @param {string} secret 密钥
 */
async function encrypt_filename_cmd(root, recursive, secret, suffix) {
  const encrypt_res = await encrypt_directory_filename(root, recursive, secret, suffix);
  if (!encrypt_res) {
    shell.exit();
    return;
  }
  temp.info(chalk.magenta(`有 ${encrypt_res.file.length} 个文件进行了加密`));
  encrypt_res.file.forEach(f => {
    temp.info(`${f.old} --> ` + chalk.green(f.new));
  });
  temp.info(chalk.yellow(`请记住附加密钥, 将会在解密时输入:  `) + chalk.underline(encrypt_res.iv));
}

/**
 * @param {string} root 起点
 * @param {boolean} recursive 是否递归子目录
 * @param {number} minSize 最小字节数
 */
async function find_dup_in_dir(root, recursive, minSize) {
  const get_file = recursive ? find_all_file_recursive : find_all_file;
  // md5 string -> file path set
  const hash_file_dict = new Map();
  const dup_file_size_hash_list = [];
  let files = await get_file(root).catch(err => {
    fileCmdLogger.info(chalk.redBright(err));
  });
  for (const file of files) {
    const size = await get_file_size(file);
    //空文件不视作重复文件
    if (size < minSize || size === 0) {
      continue;
    }
    const hash = await get_file_md5(file);
    const file_set = hash_file_dict.get(hash);
    if (file_set) {
      // 如果这个hash第二次出现, 记录.
      if (file_set.size === 1) {
        dup_file_size_hash_list.push({ h: hash, s: size });
      }
      file_set.add(file);
    } else {
      const new_file_set = new Set();
      new_file_set.add(file);
      hash_file_dict.set(hash, new_file_set);
    }
  }
  // 从大到小排列
  dup_file_size_hash_list.sort((a, b) => b.s - a.s);

  dup_file_size_hash_list.forEach((v) => {
    // 必定找得到
    const file_set = hash_file_dict.get(v.h);
    temp.info(chalk.yellow(`重复文件:  `) + chalk.magenta(get_proper_size_str(v.s, { fix: 1 })));
    file_set.forEach(f => {
      temp.info(`  - ${f}`);
    });
    temp.info(``);
  });
  console.log(`一共有 ${dup_file_size_hash_list.length} / ${files.length} 组重复文件`);
}
