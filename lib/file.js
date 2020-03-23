const crypto = require('crypto');
const fs = require('fs');
const e = require('../lib/errors');
const path = require('path');

/**
 * 计算文件的md5
 * @param {string} file
 * @returns {string}
 */
async function get_file_md5(file) {
  return new Promise((res, rej) => {
    fs.readFile(file, (err, data) => {
      if (err) {
        rej(e.get(e.E.NOT_EXIST.FILE_NOT_EXIST));
      }
      const hash = crypto.createHash('md5');
      hash.update(data);
      res(hash.digest('hex'));
    });
  });
}


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


module.exports = {
  get_file_md5: get_file_md5,
  find_all_file: find_all_file,
  find_all_file_sync: find_all_file_sync,
  find_all_file_recursive: find_all_file_recursive,
  find_all_file_recursive_sync: find_all_file_recursive_sync
};
