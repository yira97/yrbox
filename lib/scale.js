const e = require('./errors');

const one_kilo_byte = 1024;
const one_mega_byte = Math.pow(1024, 2);
const one_giga_byte = Math.pow(1024, 3);
const one_tera_byte = Math.pow(1024, 4);

const kilo_byte_str_set = new Set([
  'k',
  'kb',
]);

const mega_byte_str_set = new Set([
  'm',
  'mb',
]);

const giga_byte_str_set = new Set([
  'g',
  'gb',
]);


/**
 * 解析输入的体积字符串, 返回字节数
 * @param {string} txt
 * @returns {number}
 */
function parse_file_size_text(txt) {
  const last_num_idx = /[0-9][\s]*?[a-zA-Z]/.exec(txt);
  if (last_num_idx === null || last_num_idx === undefined) { return -1; }
  let num = Number(txt.slice(0, last_num_idx + 1));
  const scale = txt.slice(last_num_idx + 1).toLowerCase;
  if (kilo_byte_str_set.has(scale)) {
    num = byte_to_byte('kilo', 'byte', num);
  } else if (mega_byte_str_set.has(scale)) {
    num = byte_to_byte('mega', 'byte', num);
  } else if (giga_byte_str_set.has(scale)) {
    num = byte_to_byte('giga', 'byte', num);
  }
  return num;
}

/**
 * 存储空间单位换算
 * @param {'byte'|'kilo'|'mega'|'giga'|'tera'} from
 * @param {'byte'|'kilo'|'mega'|'giga'|'tera'} to
 * @param {number} n
 * @returns {number}
 */
function byte_to_byte(from, to, n) {
  let r = 1;
  switch (from) {
    case 'byte':
      switch (to) {
        case 'byte':
          r = 1;
          break;
        case 'kilo':
          r = 1 / one_kilo_byte;
          break;
        case 'mega':
          r = 1 / one_mega_byte;
          break;
        case 'giga':
          r = 1 / one_giga_byte;
          break;
        case 'tera':
          r = 1 / one_tera_byte;
          break;
        default:
          throw e.get(e.E.UNREACHABLE);
      }
      break;
    case 'kilo':
      switch (to) {
        case 'byte':
          r = one_kilo_byte;
          break;
        case 'kilo':
          r = 1;
          break;
        case 'mega':
          r = 1 / one_kilo_byte;
          break;
        case 'giga':
          r = 1 / one_mega_byte;
          break;
        case 'tera':
          r = 1 / one_giga_byte;
          break;
        default:
          throw e.get(e.E.UNREACHABLE);
      }
      break;
    case 'mega':
      switch (to) {
        case 'byte':
          r = one_mega_byte;
          break;
        case 'kilo':
          r = one_kilo_byte;
          break;
        case 'mega':
          r = 1;
          break;
        case 'giga':
          r = 1 / one_kilo_byte;
          break;
        case 'tera':
          r = 1 / one_mega_byte;
          break;
        default:
          throw e.get(e.E.UNREACHABLE);
      }
      break;
    case 'giga':
      switch (to) {
        case 'byte':
          r = one_giga_byte;
          break;
        case 'kilo':
          r = one_mega_byte;
          break;
        case 'mega':
          r = one_kilo_byte;
          break;
        case 'giga':
          r = 1;
          break;
        case 'tera':
          r = 1 / one_kilo_byte;
          break;
        default:
          throw e.get(e.E.UNREACHABLE);
      }
      break;
    case 'tera':
      switch (to) {
        case 'byte':
          r = one_tera_byte;
          break;
        case 'kilo':
          r = one_giga_byte;
          break;
        case 'mega':
          r = one_mega_byte;
          break;
        case 'giga':
          r = one_kilo_byte;
          break;
        case 'tera':
          r = 1;
          break;
        default:
          throw e.get(e.E.UNREACHABLE);
      }
      break;
    default:
      throw e.get(e.E.UNREACHABLE);
  }
  return n * r;
}

/**
 * @param {number} n
 * @param {{fix:number}} option
 * @description option.fix 小数点个数
 */
function byte_to_mega(n, option = {}) {
  n = byte_to_byte('byte', 'mega', n);
  return n.toFixed(option.fix);
}

/**
 * @method stop
 * @method is_settle
 * @method get_duration
 */
class Clock {
  constructor() {
    this.begin = Date.now();
    this.end = -1;
  }

  /**
   * @returns {void}
   */
  stop() {
    this.end = Date.now();
  }

  /**
   * @readonly
   * @returns {boolean}
   */
  is_settle() {
    return this.end !== -1;
  }

  /**
   * @returns {number} 间隔毫秒数
   */
  get_duration() {
    if (!this.is_settle()) {
      this.stop();
    }
    return this.end - this.begin;
  }

}

module.exports = {
  byte_to_byte: byte_to_byte,
  byte_to_mega: byte_to_mega,
  parse_file_size_text: parse_file_size_text,
  Clock: Clock,
};
