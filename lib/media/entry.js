
const program = require('commander');
const lib = require('./index');
const chalk = require('chalk');
const e = require('../errors');
const shell = require('shelljs');
const log = console.log;

const prog = new program.Command();
prog
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--to-hevc', '将目录下的所有视频文件转换成hevc')
  .option('--crf <crf>', 'crf', 34)
  .option('-y --yes', '直接同意')
  .option('-N --no', '直接不同意')
  .parse(process.argv);

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
          shell.echo('没装ffprobe, 自己装一下');
          shell.exit();
        } else if (err.name === e.E.FFPROBE_PROBE_ERR) {
          log("检查文件失败.\n跳过文件:" + chalk.underline(f));
        }
      }
      return false;
    });

  log(`- 压缩率: ${crf}`);
  log(`- 文件数: ${process_list.length}`);
  for (let i = 0; i < process_list.length; i++) {
    const f = process_list[i];
    log(`正在处理第 ` + chalk.green(`${i + 1}`) + ` / ${process_list.length} 个文件: ` + chalk.underline(`${f}`));
    await lib.change_video_codec(f, {
      out: lib.append_before_suffix(f, '.hevc'),
      code: 'hevc',
      crf: crf,
      overrite: overrite,
    });
  }
}

if (prog.toHevc) {
  log(chalk.magenta('开始hevc转码...'));
  let overrite = 'i';
  if (prog.yes) {
    overrite = 'y';
  }
  if (prog.no) {
    overrite = 'n';
  }
  trans_video_to_hevc(prog.dir, prog.recursive, prog.crf, overrite);
}

