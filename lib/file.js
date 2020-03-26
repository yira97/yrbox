const crypto = require('crypto');
const fs = require('fs');
const e = require('../lib/errors');
const path = require('path');
const { batch_decrypt_str, batch_encrypt_str } = require('../lib/encrypt');

/**
 * 计算文件的md5
 * @param {string} file
 * @returns {Promise<string>}
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

/**
 * 列出目录及子目录下所有文件的绝对路径(不包括文件夹)
 * @param {string} root 起点, 绝对路径
 * @returns {Promise<string[]>}
 */
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

/**
 * @param {string[]} root 起点, 绝对路径
 * @param {boolean} recursive 是否递归子目录
 * @returns {Promise<string[]>}
 */
async function find_all_file(root, recursive) {
  if (recursive) {
    return find_all_file_recursive(root);
  }
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
  let root_files;
  try {
    root_files = list_dir_file_path(root);
  } catch (err) {
    return;
  }
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
 * @param {string} from 源文件路径
 * @param {string} to 新文件名
 * @returns {Promise<string>} 返回修改后文件的路径
 */
async function rename_file(from, to) {
  return new Promise((res, rej) => {
    fs.stat(from, (err, stat) => {
      if (err) {
        rej(err);
      }
      if (!stat.isFile()) {
        rej(e.E.IS_NOT_FILE);
      }
      const dir = path.dirname(from);
      const new_file_path = path.join(dir, to);
      fs.rename(from, new_file_path, () => {
        res(new_file_path);
      });
    });
  });
}

/**
 * 批量加密文件名
 * @param {string[]} filename_list 文件名(非路径)
 * @param {string} key
 * @returns {Promise<{file: string[], iv: string}>}
 */
async function get_encrypt_filename(filename_list, key) {
  if (!filename_list || !Array.isArray(filename_list)) {
    return { file: [], iv: '' };
  }
  if (!key || key.length === 0) {
    return { file: [], iv: '' };
  }
  const split_name = filename_list.map(filename => {
    return {
      base: path.basename(filename),
      dir: path.dirname(filename),
    };
  });
  const { encrypted: encrypted_basename, iv } = batch_encrypt_str(split_name.map(sn => sn.base), key);
  const new_filename = split_name.map((s, i) => {
    return path.join(s.dir, encrypted_basename[i]);
  });
  // 假设加密后不会有同名文件
  return { file: new_filename, iv };
}

/**
 * 批量解密文件名
 * @param {string[]} encrypted_filename_list 加密的文件名列表, 绝对路径
 * @param {string} key
 * @param {string} iv
 * @returns {Promise<string[]>} 解密后的文件路径
 */
async function get_decrypt_filename(encrypted_filename_list, key, iv) {
  if (!encrypted_filename_list || !Array.isArray(encrypted_filename_list)) {
    return [];
  }
  e.throw_if_not_len_string('key', key);
  const split_name = encrypted_filename_list.map(filename => {
    return {
      base: path.basename(filename),
      dir: path.dirname(filename),
    };
  });
  const decrypted_names = batch_decrypt_str(split_name.map(sn => sn.base), key, iv);

  const new_names = [];
  for (let i = 0; i < decrypted_names.length; i++) {
    const full_real_name = path.join(split_name[i].dir, decrypted_names[i]);
    new_names.push(full_real_name);
  }
  return new_names;
}

/**
 * 加密文件夹下所有文件文件名
 * @param {string} root 起点, 绝对路径
 * @param {boolean} recursive 是否递归对子目录进行同样操作
 * @param {string} key
 * @param {string} suffix 后缀 (用于标示文件被加密过)
 * @returns {Promise<{file:{old:string, new: string}[], iv: string} | void>}
 */
async function encrypt_directory_filename(root, recursive, key, suffix) {
  e.throw_if_not_len_string('key', key);
  e.throw_if_not_len_string('suffix', suffix);
  suffix = get_add_suffix('', suffix);
  const files = await find_all_file(root, recursive);
  // 获取加密后的文件路径
  const { file: encrypt_filename, iv } = await get_encrypt_filename(files, key);
  // 把原文件名改成 加密文件名 + 后缀 的形式
  const extended_encrypt_filename = [];
  for (let i = 0; i < files.length; i++) {
    const f_extended = await rename_file(files[i], path.basename(encrypt_filename[i]) + suffix);
    extended_encrypt_filename.push(f_extended);
  }
  const pair = [];
  for (let i = 0; i < files.length; i++) {
    pair.push({
      old: files[i],
      new: extended_encrypt_filename[i],
    });
  }
  return {
    file: pair,
    iv: iv,
  };
}

/**
 * 解密文件夹下所有的文件名
 * @param {string} root 起点
 * @param {boolean} recursive 是否递归子目录
 * @param {string} key utf-8
 * @param {string} iv hex
 * @param {string} suffix 加密文件后缀
 * @returns {Promise<string[]>}
 */
async function decrypt_directory_filename(root, recursive, key, iv, suffix) {
  e.throw_if_not_len_string('key', key);
  e.throw_if_not_len_string('suffix', suffix);
  suffix = get_add_suffix('', suffix);
  let files = await find_all_file(root, recursive);
  // 仅保留带符合后缀的加密文件路径
  files = files.filter(f => f.includes(suffix));
  // 分离出无后缀的加密文件路径
  const split_files = files.map(f => {
    return {
      dir: path.dirname(f),
      base: path.basename(f).replace(suffix, ''),
    };
  });
  // 拿加密文件名转出原文件名
  const real_files = await get_decrypt_filename(split_files.map(sf => path.join(sf.dir, sf.base)), key, iv);

  // 把加密文件改名
  for (let i = 0; i < files.length; i++) {
    await rename_file(files[i], path.basename(real_files[i]));
  }
  return real_files;
}

/**
 * 获取添加后缀名后的文件名
 * @param {string} filename
 * @param {string} suffix
 * @returns {string}
 * @description 如果filename是空, 正常返回以点开头的后缀
 */
function get_add_suffix(filename, suffix) {
  if (filename === undefined) {
    filename = '';
  }
  if (!suffix || suffix.length === 0) {
    return filename;
  }
  if (suffix[0] !== '.') {
    suffix = '.' + suffix;
  }

  return filename + suffix;
}

module.exports = {
  get_file_md5: get_file_md5,
  find_all_file: find_all_file,
  find_all_file_sync: find_all_file_sync,
  find_all_file_recursive: find_all_file_recursive,
  find_all_file_recursive_sync: find_all_file_recursive_sync,
  get_file_size: get_file_size,
  rename_file: rename_file,
  get_encrypt_filename: get_encrypt_filename,
  get_decrypt_filename: get_decrypt_filename,
  encrypt_directory_filename: encrypt_directory_filename,
  decrypt_directory_filename: decrypt_directory_filename,
};
