
const program = require('commander');
const lib = require('../lib/media');
const chalk = require('chalk');
const { byte_to_mega, Clock } = require('../lib/scale');
const ora = require('ora');
const { mediaCli } = require('../lib/logger');
const { find_all_file_recursive, find_all_file } = require('../lib/file');

const prog = new program.Command();
prog
  .command('tohevc')
  .description('将目录下的所有视频文件转换成hevc')
  .requiredOption('-d --dir <path>', '起点目录')
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--re', '已经是hevc编码的视频也加入执行队列')
  .option('--crf <crf>', 'crf', 34)
  .option('-y --yes', '直接同意')
  .option('-N --no', '直接不同意')
  .action(param => {
    let overrite = 'i';
    if (param.yes) {
      overrite = 'y';
    }
    if (param.no) {
      overrite = 'n';
    }
    trans_video_to_hevc({
      root: param.dir,
      recursive: param.recursive,
      crf: param.crf,
      overrite: overrite,
      re: param.re,
    });
  });

prog.parse(process.argv);

/**
 * 转换视频为hevc编码
 * @param {{
 *   root: string,
 *   recursive: boolean,
 *   crf: number,
 *   overrite: 'y' | 'N' | 'i',
 *   re: boolean
 * }} param0
 */
async function trans_video_to_hevc({ root, recursive, crf, overrite, re }) {
  const get_file = recursive ? find_all_file_recursive : find_all_file;
  const spin = ora().start('生成文件列表');
  let files = await get_file(root).then(res => {
    spin.succeed();
    return res;
  });
  spin.start('确定转码文件');
  let process_list = files;
  if (!re) {
    process_list = await lib.non_hevc_filter(files).then(res => {
      spin.succeed();
      return res;
    });
  } else {
    process_list = process_list.filter(p => lib.has_video_suffix(p));
    spin.succeed();
  }
  mediaCli.info(`- CRF   : ${crf}`);
  mediaCli.info(`- 文件数 : ${process_list.length}`);
  for (let i = 0; i < process_list.length; i++) {
    const f = process_list[i];
    const original_mega = byte_to_mega(lib.get_file_size(f), { fix: 0 });
    const f_after = lib.append_before_suffix(f, '.hevc');
    mediaCli.info(`⛓️ 正在处理第 ${i + 1} / ${process_list.length} 个文件: ${chalk.underline(`${f}`)}`);
    const clock = new Clock();
    await lib.change_video_codec(f, {
      out: f_after,
      code: 'hevc',
      crf: crf,
      overrite: overrite,
    });
    const generated_mega = byte_to_mega(lib.get_file_size(f_after), { fix: 0 });
    const ratio = (generated_mega / original_mega * 100).toFixed(1);
    mediaCli.info(`    转码完成. 🗜️ ` +
      chalk.yellow(`${ratio}%`) +
      chalk.green(` (${original_mega - generated_mega}MB)` +
        chalk.white(` 用时${(clock.get_duration() / 1000).toFixed(0)}秒`)
      ));
  }
}
