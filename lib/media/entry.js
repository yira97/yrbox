
const program = require('commander');
const lib = require('./index');

const prog = new program.Command();
prog
  .option('-d --dir <path>', '起点目录', process.cwd())
  .option('-r --recursive', '递归对子目录做相同的操作')
  .option('--to-hevc <crf>', '将目录下的所有视频文件转换成hevc', 34)
  .parse(process.argv);

if (prog.toHevc) {
  const root = prog.dir;
  const files = prog.recursive === true ? lib.find_all_file_recursive(root) :lib.find_all_file(root);
  const process_list = files.filter(f => lib.has_video_suffix(f));
  console.log(process_list);
}

