/**
 * 叶子键的值与其键名相同
 */
const ERR_TREE = {
  NOT_EXIST: {
    FFPROBE_NOT_EXIST: 'FFPROBE_NOT_EXIST',
    SOFTWARE_NOT_EXIST: 'SOFTWARE_NOT_EXIST',
    FILE_NOT_EXIST: 'FILE_NOT_EXIST',
  },
  FFPROBE_PROBE_ERR: 'FFPROBE_PROBE_ERR',
  IS_NOT_FILE: 'IS_NOT_FILE',
  IS_NOT_DIR: 'IS_NOT_DIR',
  NO_PATH: 'NO_PATH',
  UNREACHABLE: 'UNREACHABLE',
  NO_MATCH: {
    NO_MATCH_COMMAND: 'NO_MATCH_COMMAND',
  },
  JSON_PARSE: 'JSON_PARSE',
  INVALID: {
    INVALID_LEN_STRING: 'INVALID_LEN_STRING',
    INVALID_ARRAY: 'INVALID_ARRAY',
    INVALID_LEN_ARRAY: 'INVALID_LEN_ARRAY',
    INVALID_SECRET: 'INVALID_SECRET',
  },
  COMMAND_EXEC_FAIL: 'COMMAND_EXEC_FAIL',
};

/**
 * 获取 Error
 * @param {string} err_name 错误名称
 * @param {string} msg 错误信息
 * @returns {Error}
 */
function get(err_name, msg, option) {
  switch (err_name) {
    case 'INVALID_LEN_STRING': {
      msg = `${option.name} field get invalid string -> ${option.value}. ` + msg;
      break;
    }
    case 'INVALID_ARRAY': {
      msg = `${option.name} field get invalid array -> ${option.value}. ` + msg;
      break;
    }
    case 'INVALID_LEN_ARRAY': {
      msg = `${option.name} field get invalid array -> ${option.value}. ` + msg;
      break;
    }
    default:
      msg = err_name;
  }
  const err = new Error(msg);
  err.name = err_name;
  return err;
}

/**
 * 如果没有接受到一个有长度的字符串, 就抛出异常
 * @param {string} s
 */
function throw_if_not_len_string(name, s) {
  if (!s || s.length === 0) {
    throw get(ERR_TREE.INVALID.INVALID_LEN_STRING, '', { name: name, value: s });
  }
}

function throw_if_not_array(name, a) {
  if (!a || !Array.isArray(a)) {
    throw get(ERR_TREE.INVALID_ARRAY, '', { name: name, value: a });
  }
}

function throw_if_not_len_array(name, a) {
  if (!a || !Array.isArray(a) || a.length === 0) {
    throw get(ERR_TREE.INVALID_LEN_ARRAY, '', { name: name, value: a });
  }
}

module.exports = {
  E: ERR_TREE,
  get: get,
  throw_if_not_len_string: throw_if_not_len_string,
  throw_if_not_array: throw_if_not_array,
  throw_if_not_len_array: throw_if_not_len_array,
};
