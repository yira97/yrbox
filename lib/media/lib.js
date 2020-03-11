const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

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
  if (!stat.isDirectory) {throw new Error('not a dir');}

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
  if (!stat.isDirectory) {throw new Error('not a dir');}

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
  if (known_path.has(root)) {return;}
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
 * 列出目录下的所有文件(包括文件夹)的绝对路径
 * @param {string} p 绝对路径 
 * @returns {string[]}
 */
function list_dir_file_path (p) {
  return fs.readdirSync(p).map(file_name => path.join(p, file_name));
}

/**
 * 返回后缀名
 * @param {string} filename
 * @returns {string} 后缀名(不包含.)
 */
function get_file_suffix (filename) {
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
 * 获取视频编码
 * @param {string} file 绝对路径
 * @returns {string} 'hevc', 'h264'
 */
function get_video_encode(file) {
  const f_info = shell.exec(`ffmpeg -i ${file}`);
  if (f_info.stderr !== '') {throw new Error(f_info.stderr);}
  const out = f_info.stdout;
  const video_encode_reg = /Stream\s+.*?:\s+Video:\s+(.*?)\s+\(Main\)/;
  const match_res = video_encode_reg.exec(out);
  if (match_res.length <= 1) {throw new Error(`正则表达式未正确匹配, match_res=${match_res}.`);}
  if (match_res.length >= 2) {
    console.log(`正则表达式返回了过多的结果. expect:1, actually:${match_res.length - 1}`);
  }
  const video_encode = match_res[1].trim();
  return video_encode;
}

exports.find_all_file = find_all_file;
exports.find_all_file_recursive = find_all_file_recursive;
exports.has_video_suffix = has_video_suffix;
exports.has_audio_suffix = has_audio_suffix;
exports.get_video_encode = get_video_encode;