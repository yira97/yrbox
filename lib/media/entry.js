
const program = require('commander');
const lib = require('./index');
const chalk = require('chalk');
const e = require('../errors');
const scale = require('../scale');
const shell = require('shelljs');
const log = console.log;

const prog = new program.Command();
prog
  .command('tohevc')
  .description('将目录下的所有视频文件转换成hevc')
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--crf <crf>', 'crf', 34)
  .option('-y --yes', '直接同意')
  .option('-N --no', '直接不同意')
  .action(param => {
    log(chalk.magenta('开始hevc转码...'));
    let overrite = 'i';
    if (param.yes) {
      overrite = 'y';
    }
    if (param.no) {
      overrite = 'n';
    }
    trans_video_to_hevc(param.dir, param.recursive, param.crf, overrite);
  });

prog.parse(process.argv);

/**
 * @param {string} root 起点目录
 * @param {boolean} recursive 是否递归
 * @param {number} crf 压缩率
 * @param {'y'|'n'|'i'} overrite 是否覆盖
 * @returns {Promise<null>}
 */
async function trans_video_to_hevc(root, recursive, crf, overrite) {
  const files = recursive ? lib.find_all_file_recursive(root) : lib.find_all_file(root);

  const process_list = files
    .filter(f => lib.has_video_suffix(f))
    .filter(f => {
      try {
        const stat = lib.get_video_stat(f);
        if (!stat) { return false; }
        // 只处理视频
        if (stat.codec_type !== 'video') { return false; }
        // 已经是hevc的不处理
        if (stat.codec_name === 'hevc') { return false; }
        return true;
      } catch (err) {
        if (err.name === e.E.NOT_EXIST.FFPROBE_NOT_EXIST) {
          log(chalk.red(`没装ffprobe, 自己装一下`));
          shell.exit();
        } else if (err.name === e.E.FFPROBE_PROBE_ERR) {
          log(`检查文件失败.\n跳过文件: ${chalk.underline(f)}`);
          return false;
        } else {
          log(chalk.red(`${err}错误.\n跳过文件: ${chalk.underline(f)}`));
          return false;
        }
      }
    });
  log(`-   CRF: ${crf}`);
  log(`- 文件数: ${process_list.length}`);
  for (let i = 0; i < process_list.length; i++) {
    const f = process_list[i];
    const original_size = lib.get_file_size(f);
    const original_mega = Math.floor(scale.byte_to_mega(original_size));
    const f_after = lib.append_before_suffix(f, '.hevc');
    log(`正在处理第 ` + chalk.green(`${i + 1}`) + ` / ${process_list.length} 个文件: ` + chalk.underline(`${f}`));
    await lib.change_video_codec(f, {
      out: f_after,
      code: 'hevc',
      crf: crf,
      overrite: overrite,
    });
    const generated_size = lib.get_file_size(f_after);
    if (generated_size === 0) {
      throw e.get(e.E.UNREACHABLE, 'divide 0');
    }
    const generated_mega = Math.floor(scale.byte_to_mega(generated_size));
    log(`- 原始大小: ${original_mega}M, 最终大小: ${generated_mega}M, 压缩率: ${Math.floor(generated_mega / original_mega * 100)}%`);
    log(chalk.blue(`${f} 转码完成.`));
  }
}
