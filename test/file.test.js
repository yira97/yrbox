const file = require('../lib/file');
const path = require('path');
const fs = require('fs');
const this_dir = __dirname;

/**
 * @param {string} root 绝对路径
 * @returns {{path:string, clean: () => {}}}
 */
function init_test_dir(root) {
  const d = path.join(root, 'temp-for-test');
  const clean = () => { fs.rmdirSync(d, { recursive: true }); };
  clean();
  fs.mkdirSync(d);
  fs.mkdirSync(path.join(d, `t1`));
  fs.mkdirSync(path.join(d, `t2`));
  fs.mkdirSync(path.join(d, `t2`, `t3`));
  fs.mkdirSync(path.join(d, `t1`, `t4`));
  fs.writeFileSync(path.join(d, `t1`, `a.mp4`), `some data`);
  fs.writeFileSync(path.join(d, `t1`, `b.js`), `some data`);
  fs.writeFileSync(path.join(d, `t2`, `1.MP4`), `some data`);
  fs.writeFileSync(path.join(d, `t2`, `2.mp4`), `some data`);
  fs.writeFileSync(path.join(d, `t2`, `t3`, `n.mp4`), `some data`);
  fs.writeFileSync(path.join(d, `t2`, `t3`, `m.json`), `some data`);
  return {
    path: d,
    clean: clean,
  };
}

test('testing file', async () => {
  const test_dir = init_test_dir(this_dir);
  const test_res = await file.find_all_file(path.join(test_dir.path, 't1'));
  const answer = ['a.mp4', 'b.js'].map(name => path.join(test_dir.path, 't1', name));
  expect(test_res).toEqual(answer);
  test_dir.clean();
});

test('testing find_all_file_recursive', async () => {
  const test_dir = init_test_dir(this_dir);
  const answer = ['t1/a.mp4', 't1/b.js', 't2/1.MP4', 't2/2.mp4', 't2/t3/n.mp4', 't2/t3/m.json'].map(f => path.join(test_dir.path, f));
  const test_res = await file.find_all_file_recursive(test_dir.path);
  test_res.sort();
  answer.sort();
  expect(test_res).toEqual(answer);
  test_dir.clean();
});

test('test rename file', async () => {
  const test_dir = init_test_dir(this_dir);
  const old_path = path.join(test_dir.path, 't1', 'a.mp4');
  const new_path = await file.rename_file(old_path, 't1', '__a.mp4');

  let old_exist = fs.existsSync(old_path);
  expect(old_exist).toBe(false);

  let new_exist = fs.existsSync(new_path);
  expect(new_exist).toBe(true);
  test_dir.clean();
});

test('test encrypt files', async () => {
  const test_dir = init_test_dir(this_dir);
  const encrypt_dir = path.join(test_dir.path);
  const files = await file.find_all_file_recursive(encrypt_dir);
  const key = 'hahaha';
  const { file: encrypt_filename, iv } = await file.get_encrypt_filename(files, key);
  for (let i = 0; i < files.length; i++) {
    await file.rename_file(files[i], path.basename(encrypt_filename[i]));
    expect(fs.existsSync(encrypt_filename[i])).toBe(true);
    expect(!fs.existsSync(files[i])).toBe(true);
  }
  const decrypted_filename = await file.get_decrypt_filename(encrypt_filename, key, iv);
  expect(decrypted_filename).toEqual(files);
  test_dir.clean();
});

test('test encrypt files 2', async () => {
  const test_dir = init_test_dir(this_dir);
  const encrypt_dir = path.join(test_dir.path);
  const key = 'hahaha';
  const suffix = '.encp';
  const encrypt_res = await file.encrypt_directory_filename(encrypt_dir, true, key, suffix);
  if (!encrypt_res) {
    throw new Error('no encrypt result');
  }
  const { file: files, iv } = encrypt_res;
  expect(files.length).toEqual(6);
  files.forEach(f => {
    expect(fs.existsSync(f.old)).toBe(false);
    expect(fs.existsSync(f.new)).toBe(true);
  });
  const decrypted_filename = await file.decrypt_directory_filename(encrypt_dir, true, key, iv, suffix);

  // 因为加密后, 文件排序会发生变化, 导致返回后的文件顺序也有可能和初始文件顺序不同.
  decrypted_filename.sort();
  files.sort((a, b) => a.old < b.old);
  expect(decrypted_filename).toEqual(files.map(f => f.old));

  test_dir.clean();
});
