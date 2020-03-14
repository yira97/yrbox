
const shell = require('shelljs');
const path = require('path');
const media = require('./index');
const this_dir = __dirname;

/**
 * @param {string} root 绝对路径
 * @returns {{path:string, clean:string}}
 */
function init_test_dir(root) {
  const d = path.join(root, 'temp-for-test');
  shell.exec(`
  mkdir -p ${d}/t1 ${d}/t2 && \
  mkdir -p ${d}/t2/t3 ${d}/t1/t4 && \
  touch ${d}/t1/a.mp4 ${d}/t1/b.js ${d}/t2/1.MP4 ${d}/t2/2.mp4 ${d}/t2/t3/n.mp4 ${d}/t2/t3/m.json \
  `);
  return {
    path: d,
    clean: `rm -rf ${d}`,
  };
}



test('testing find_all_file', () => {
  const test_dir = init_test_dir(this_dir);
  const test_res = media.find_all_file(path.join(test_dir.path, 't1'));
  const answer = ['a.mp4', 'b.js'].map(name => path.join(test_dir.path, 't1', name));
  expect(test_res).toEqual(answer);
  shell.exec(test_dir.clean);
});

test('testing find_all_file_recursive', () => {
  const test_dir = init_test_dir(this_dir);
  const answer = ['t1/a.mp4', 't1/b.js', 't2/1.MP4', 't2/2.mp4', 't2/t3/n.mp4', 't2/t3/m.json'].map(f => path.join(test_dir.path, f));
  const test_res = media.find_all_file_recursive(test_dir.path);
  test_res.sort();
  answer.sort();
  expect(test_res).toEqual(answer);
  shell.exec(test_dir.clean);
});
