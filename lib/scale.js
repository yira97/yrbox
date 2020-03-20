const e = require('./errors');

const one_kilo_byte = 1024;
const one_mega_byte = Math.pow(1024, 2);
const one_giga_byte = Math.pow(1024, 3);
const one_tera_byte = Math.pow(1024, 4);

/**
 * 存储单位换算
 * @param {'byte'|'kilo'|'mega'|'giga'|'tera'} from
 * @param {'byte'|'kilo'|'mega'|'giga'|'tera'} to
 * @param {number} n
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

module.exports = {
  byte_to_byte: byte_to_byte,
  byte_to_mega: byte_to_mega,
};
