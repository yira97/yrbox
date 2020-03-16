/**
 * 叶子键的值与其键名相同
 */
const ERR_TREE = {
  NOT_EXIST: {
    FFPROBE_NOT_EXIST: 'FFPROBE_NOT_EXIST',
    SOFTWARE_NOT_EXIST: 'SOFTWARE_NOT_EXIST',
  },
  FFPROBE_PROBE_ERR: 'FFPROBE_PROBE_ERR',
  IS_NOT_DIR: 'IS_NOT_DIR',
  NO_PATH: 'NO_PATH',
  UNREACHABLE: 'UNREACHABLE',
  NO_MATCH: {
    NO_MATCH_COMMAND: 'NO_MATCH_COMMAND',
  },
};

/**
 * 获取 Error
 * @param {string} err_name 错误名称
 * @param {string} msg 错误信息
 * @returns {Error}
 */
function get(err_name, msg) {
  const err = new Error(msg);
  err.name = err_name;
  return err;
}

exports.E = ERR_TREE;
exports.get = get;
