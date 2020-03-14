const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');

const video_suffix = new Set([
  'mp4',
  'MP4',
  'm4a',
  'mkv',
  'MKV',
  'flv',
  'FLV',
]);

const audio_suffix = new Set([
  'mp3',
  'aac',
]);

/**
 * 列出目录及子目录下所有文件的绝对路径(不包括文件夹)
 * @param {string} root 起点, 绝对路径
 * @returns {string[]}
 */
function find_all_file_recursive(root) {
  const stat = fs.statSync(root);
  if (!stat.isDirectory) { throw new Error('not a dir'); }

  const files = new Set();
  const known_path = new Set();
  find_all_file_recursive_impl(root, files, known_path);
  const file_arr = Array.from(files);
  return file_arr;
}

/**
 * 列出目录下所有文件的绝对路径(不包括文件夹)
 * @description 不递归子目录
 * @param {string} root 起点, 绝对路径
 * @returns {string[]}
 */
function find_all_file(root) {
  const stat = fs.statSync(root);
  if (!stat.isDirectory) { throw new Error('not a dir'); }

  const root_files = list_dir_file_path(root).filter(f => !fs.statSync(f).isDirectory());
  return root_files;
}

/**
 * find_all_file_recursive的递归形式的具体实现
 * @param {string} root 绝对路径
 * @param {Set<string>} files 扫描到的文件
 * @param {Set<string>} known_path 扫描过的路径
 * @returns {void}
 */
function find_all_file_recursive_impl(root, files, known_path) {
  if (known_path.has(root)) { return; }
  // 相信root正确
  // const stat = fs.statSync(root);
  // if (!stat.isDirectory) {throw new Error('not a dir');}
  known_path.add(root);
  const root_files = list_dir_file_path(root);
  root_files.forEach(f => {
    const f_stat = fs.statSync(f);
    if (f_stat.isDirectory()) {
      find_all_file_recursive_impl(f, files, known_path);
    } else {
      files.add(f);
    }
  });
}

/**
 * 通过编码名称获取编码器名称
 * @param {'hevc'|'h264'} name 编码
 * @returns {string}
 * @description 找不到就返回null
 */
function codec_from_video_code_name(name) {
  let cc;
  switch (name) {
    case 'hevc':
      cc = 'libx265';
      break;
    case 'h264':
      cc = 'libx264';
      break;
    default:
      cc = null;
  }
  return cc;
}

/**
 * 转换视频文件编码
 * @param {string} file 输入文件路径
 * @param {{
 *  out:string
 *  code: 'hevc' | 'h264'
 *  crf: number
 *  overrite: 'y' | 'n' | 'i'
 * }} option
 * @returns {Promise<boolean>}
 */
async function change_video_codec(file, option) {
  if (option.out === '') { throw new Error('未指定输出路径'); }
  const cc = codec_from_video_code_name(option.code);
  // 主意路径中包含的空格, 需要用引号包裹
  // 进度信息来自debug日志, 被输出到了stderr, 需要转到stdout
  const cmd = `ffmpeg -i '${file}' -c:v ${cc} -crf:${option.crf}  -y '${option.out}' 2>&1`;
  const child = shell.exec(cmd, { silent: true, async: true });

  const recode_process = new Promise((res) => {
    child.stdout.on('data', data => {
      // 遭遇覆盖的交互: stderr.on.data: File 'xxx' already exists. Overwrite ? [y/N]
      if (data.indexOf('already exists. Overwrite') > 0) {
        if (option.overrite === 'y') {
          child.stdin.write('y\n');
        } else if (option.overrite === 'n') {
          child.stdin.write('N\n');
        } else if (option.overrite === 'i') {
          console.log(`${option.out} 已存在, 是否进行覆盖? [y/n]`);
          prepare_write_stream_once(process.stdin, child.stdin);
        } else {
          // 默认
          console.log(data);
          prepare_write_stream_once(process.stdin, child.stdin);
        }
      }
      if (data.indexOf('frame=') >= 0 && data.indexOf('speed=') >= 0) {
        process.stdout.write(`\r${data}`);
      }
    });

    child.stdout.on('end', () => {
      console.log(chalk.blue(`${file} 转码完成.`));
      res(true);
    });
  });
  return recode_process;
}

/**
 * 临时嫁接一个input流
 * @param {NodeJS.ReadStream} from_in 从哪借in
 * @param {NodeJS.ReadStream} dest_in 送到哪个in
 */
function prepare_write_stream_once(from_in, dest_in) {
  from_in.pipe(dest_in);
  from_in.once('close', () => {
    from_in.unpipe(dest_in);
  });
}

/**
 * 列出目录下的所有文件(包括文件夹)的绝对路径
 * @param {string} p 绝对路径
 * @returns {string[]}
 */
function list_dir_file_path(p) {
  return fs.readdirSync(p).map(file_name => path.join(p, file_name));
}

/**
 * 在文件后缀名之前, 追加文本
 * @param {string} name
 * @param {string} s
 */
function append_before_suffix(name, s) {
  const last_dot = name.lastIndexOf('.');
  // 没后缀, 直接加
  if (last_dot < 0) {
    name += s;
  } else {
    name = name.slice(0, last_dot) + s + name.slice(last_dot);
  }
  return name;
}

/**
 * 返回后缀名
 * @param {string} filename
 * @returns {string} 后缀名(不包含.)
 */
function get_file_suffix(filename) {
  const dot_idx = filename.lastIndexOf('.');
  return filename.slice(dot_idx + 1);
}

/**
 * 根据后缀名判断是否是视频文件
 * @param {string} filename
 * @returns {boolean}
 */
function has_video_suffix(filename) {
  return video_suffix.has(get_file_suffix(filename));
}

function has_audio_suffix(filename) {
  return audio_suffix.has(get_file_suffix(filename));
}

/**
 * 确定软件是否存在
 * @param {string} name
 * @param {{
 *  throw: boolean
 * }} option
 * @returns {boolean}
 */
function exist(name, option = { throw: false }) {
  const existence = shell.which(name);
  if (!existence) {
    // 是否抛出异常替代返回false
    if (option.throw) {
      throw new Error(`${name} 不存在!`);
    } else {
      return false;
    }
  }
  return true;
}

/**
 * @typedef {{
 *  codec_name: string
 *  codec_type: string
 *  width: number
 *  height: number
 *  coded_width: number
 *  coded_height: number
 *  start_time: string
 *  duration_ts: number
 *  duration: string
 *  bit_rate: string
 * }} VideoStat 视频元信息结构
 */

/**
 * 获取视频元信息
 * @param {string} file 绝对路径
 * @returns {VideoStat}
 * @description 默认返回第一条视频流, 没有视频流就返回null
 */
function get_video_stat(file) {
  exist('ffprobe');
  const cmd = `ffprobe -print_format json  -show_streams '${file}'`;
  const f_info = shell.exec(cmd, { silent: true });
  const stream = JSON.parse(f_info.stdout);

  if (stream.streams === undefined ||
    stream.streams['0'] === undefined) {
    throw new Error(`ffprobe 查询文件信息错误. stream.streams = ${stream.streams}`);
  }
  const video_streams = stream.streams.filter(s => s.codec_type === 'video');
  if (video_streams.length < 1) {
    return null;
  }
  return video_streams[0];
}

exports.find_all_file = find_all_file;
exports.find_all_file_recursive = find_all_file_recursive;
exports.has_video_suffix = has_video_suffix;
exports.has_audio_suffix = has_audio_suffix;
exports.change_video_codec = change_video_codec;
exports.get_video_stat = get_video_stat;
exports.append_before_suffix = append_before_suffix;
