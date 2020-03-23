const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const e = require('../errors');
const chalk = require('chalk');
const ProgressBar = require('progress');
const { mediaCli } = require('../logger');
const os = require('os');

const video_suffix = new Set([
  'mp4',
  'm4a',
  'mkv',
  'flv',
  'avi',
  'mov',
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
function find_all_file_recursive_sync(root) {
  const stat = fs.statSync(root);
  if (!stat.isDirectory) { throw e.get(e.E.IS_NOT_DIR); }

  const files = new Set();
  const known_path = new Set();
  find_all_file_recursive_impl(root, files, known_path);
  const file_arr = Array.from(files);
  return file_arr;
}

async function find_all_file_recursive(root) {
  return new Promise((res, rej) => {
    fs.stat(root, (err, stat) => {
      if (err) { rej(err); }
      if (!stat.isDirectory()) { rej(e.get(e.E.IS_NOT_DIR)); }
      const files = new Set();
      const known_path = new Set();
      find_all_file_recursive_impl(root, files, known_path);
      const file_arr = Array.from(files);
      res(file_arr);
    });
  });
}

/**
 * 列出目录下所有文件的绝对路径(不包括文件夹)
 * @description 不递归子目录
 * @param {string} root 起点, 绝对路径
 * @returns {string[]}
 */
function find_all_file_sync(root) {
  const stat = fs.statSync(root);
  if (!stat.isDirectory) { throw e.get(e.E.IS_NOT_DIR); }

  const root_files = list_dir_file_path(root).filter(f => !fs.statSync(f).isDirectory());
  return root_files;
}

async function find_all_file(root) {
  return new Promise((res, rej) => {
    fs.stat(root, (err, stat) => {
      if (err) { rej(err); }
      if (!stat.isDirectory()) { rej(e.get(e.E.IS_NOT_DIR)); }
      const root_files = list_dir_file_path(root).filter(f => !fs.statSync(f).isDirectory());
      res(root_files);
    });
  });
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
  const cmd = `ffmpeg -i ${get_safe_name(file)} -c:v ${cc} -crf:${option.crf}  -y ${get_safe_name(option.out)} 2>&1`;
  const child = shell.exec(cmd, { silent: true, async: true });
  const total_seconds = Math.floor(Number(get_video_stat(file).duration)) - 2;
  const bar = new ProgressBar('    转码中 [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: total_seconds,
  });
  const timer = setInterval(function () {
    if (bar.complete) {
      clearInterval(timer);
    }
  }, 1000);
  const duration_reg = /\d\d:\d\d:\d\d/;
  const recode_process = new Promise((res) => {
    child.stdout.on('data', data => {
      // 遭遇覆盖的交互: stderr.on.data: File 'xxx' already exists. Overwrite ? [y/N]
      if (data.indexOf('already exists. Overwrite') > 0) {
        if (option.overrite === 'y') {
          child.stdin.write('y\n');
        } else if (option.overrite === 'n') {
          child.stdin.write('N\n');
        } else if (option.overrite === 'i') {
          mediaCli.info(`${option.out} 已存在, 是否进行覆盖? [y/n]`);
          prepare_write_stream_once(process.stdin, child.stdin);
        } else {
          // 默认
          mediaCli.info(data);
          prepare_write_stream_once(process.stdin, child.stdin);
        }
      }
      if (!total_seconds) { return; }
      if (data.indexOf("time=") < 0) { return; }
      const duration = duration_reg.exec(data);
      if (!duration || Math.random() > 0.7) { return; }
      const pace = parse_time_duration(duration[0]) - bar.curr;
      if (pace <= 0) { return; }
      bar.tick(pace);
    });

    child.stdout.on('end', () => {
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
 * @description 不包括 . 和 .. 目录
 */
function list_dir_file_path(p) {
  return fs.readdirSync(p)
    .filter(file_name => file_name !== '..' && file_name !== '.')
    .map(file_name => path.join(p, file_name));
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
  const suffix = filename.slice(dot_idx + 1);
  return suffix;
}

/**
 * 根据后缀名判断是否是视频文件
 * @param {string} filename
 * @returns {boolean}
 */
function has_video_suffix(filename) {
  return video_suffix.has(get_file_suffix(filename).toLowerCase());
}

function has_audio_suffix(filename) {
  return audio_suffix.has(get_file_suffix(filename).toLowerCase());
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
      throw e.get(e.E.NOT_EXIST.SOFTWARE_NOT_EXIST);
    } else {
      return false;
    }
  }
  return true;
}

/**
 * 获取文件大小
 * @param {string} file 绝对路径
 * @returns number
 */
function get_file_size(file) {
  let size;
  try {
    size = fs.statSync(file).size;
  } catch (err) {
    size = -1;
  }
  return size;
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
 *  size: number
 *  }} VideoStat 视频元信息结构
 */


/**
 * 把原始文件路径转换成shell中的写法
 * @param {string} name
 */
function get_safe_name(name) {
  const os_type = os.type();
  if (os_type === 'Windows_NT') {
    // Windows命令行终端使用^字符转义那些具有特殊含义的保留字符（如：& | ( ) < > ^）
    // 先把文件名中的双引号全转义， 再用双引号包裹
    name = name
      .replace(/"/g, `^"`);
    return `"${name}"`
  } else {
    return name
      .replace(/'/g, `\\'`) // 单引号
      .replace(/\[/g, `\\[`) // 左方括号
      .replace(/\]/g, `\\]`) // 右方括号
      .replace(/ /g, `\\ `) // 空格
      .replace(/\(/g, `\\(`) // 左圆括号
      .replace(/\)/g, `\\)`) // 右圆括号
      .trim();
  }
}

/**
 * 获取视频元信息
 * @param {string} file 绝对路径
 * @returns {VideoStat}
 * @description 默认返回第一条视频流, 没有视频流就返回null
 */
function get_video_stat(file) {
  exist('ffprobe', { throw: true });
  const cmd = `ffprobe -print_format json  -show_streams ${get_safe_name(file)}`;
  const f_info = shell.exec(cmd, { silent: true });
  let stream;
  try {
    stream = JSON.parse(f_info.stdout);
  } catch (err) {
    mediaCli.info(`parse错误: ${f_info.stderr}\n文件路径:${file}`);
    throw e.get(e.E.JSON_PARSE);
  }
  if (stream.streams === undefined ||
    stream.streams['0'] === undefined) {
    throw e.get(e.E.FFPROBE_PROBE_ERR);
  }
  const video_streams = stream.streams.filter(s => s.codec_type === 'video');
  if (video_streams.length < 1) {
    return null;
  }
  const video_stat = video_streams[0];
  video_stat.size = get_file_size(file);
  return video_stat;
}

/**
 * 将 00:00:00 格式的时间段 转换为秒
 * @param {number} s
 * @returns {number}
 */
function parse_time_duration(s) {
  const [hour, minute, second] = s.split(':').map(n => Number(n));
  return hour * 3600 + minute * 60 + second;
}

/**
 * @param {string[]} files
 * @returns {Promise<string[]>}
 */
async function non_hevc_filter(files) {
  return new Promise((res, rej) => {
    files = files
      .filter(f => has_video_suffix(f))
      .filter(f => {
        let stat;
        try {
          stat = get_video_stat(f);
        } catch (err) {
          if (err.name === e.E.NOT_EXIST.FFPROBE_NOT_EXIST) {
            mediaCli.info(chalk.red(`没装ffprobe, 自己装一下`));
            rej(err);
          } else if (err.name === e.E.FFPROBE_PROBE_ERR) {
            mediaCli.info(chalk.red(`检查文件失败.跳过文件: ${chalk.underline(f)}`));
          } else {
            mediaCli.warn(chalk.red(`${err.name}错误.跳过文件: ${chalk.underline(f)}`));
          }
          stat = undefined;
        }
        if (!stat || stat.codec_type !== 'video' || stat.codec_name === 'hevc') {
          return false;
        }
        return true;
      });
    res(files);
  });
}

exports.find_all_file = find_all_file;
exports.find_all_file_sync = find_all_file_sync;
exports.find_all_file_recursive = find_all_file_recursive;
exports.find_all_file_recursive_sync = find_all_file_recursive_sync;
exports.has_video_suffix = has_video_suffix;
exports.has_audio_suffix = has_audio_suffix;
exports.change_video_codec = change_video_codec;
exports.get_video_stat = get_video_stat;
exports.append_before_suffix = append_before_suffix;
exports.get_file_size = get_file_size;
exports.parse_time_duration = parse_time_duration;
exports.non_hevc_filter = non_hevc_filter;
