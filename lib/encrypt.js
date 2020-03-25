const crypto = require('crypto');
const e = require('./errors');

/**
 * @param {string} text 任意长度非空字符串
 * @param {string} key 任意长度非空字符串
 * @param {string | void} iv hex. 如果为空, 使用随机iv. 否则, 使用指定iv.
 * @returns {{encrypted: string, iv: string} | void}
 */
function encrypt_str(text, key, iv) {
  if (!text || text.length === 0) {
    return { encrypted: '', iv: '' };
  }
  if (!key || key.length === 0) {
    throw e.get(e.E.INVALID.INVALID_SECRET);
  }
  // 保证 32 byte
  const hashed_key = crypto.createHash('sha256').update(key).digest('latin1').slice(0, 32);
  // 32 byte secret
  const key_byte = Buffer.from(hashed_key, 'latin1');
  // 16 byte random
  let iv_byte;
  // 如果为空, 使用随机iv. 否则, 使用指定iv.
  if (!iv) {
    iv_byte = crypto.randomBytes(16);
    iv = iv_byte.toString('hex');
  } else {
    iv_byte = Buffer.from(iv, 'hex');
  }

  const cipher = crypto.createCipheriv('aes-256-cbc', key_byte, iv_byte);
  let crypted = cipher.update(text, 'utf-8');
  crypted += cipher.final('hex');
  return { encrypted: crypted, iv: iv };
}

/**
 * @description 配合 encrypt 函数使用
 * @param {string} encrypted utf-8
 * @param {string} key utf-8
 * @param {string} iv hex
 * @returns {string}
 */
function decrypt_str(encrypted, key, iv) {
  if (!key || key.length === 0) {
    throw e.get(e.E.INVALID.INVALID_SECRET);
  }
  const hashed_key = crypto.createHash('sha256').update(key).digest('latin1').slice(0, 32);
  const key_byte = Buffer.from(hashed_key, 'latin1');
  const iv_byte = Buffer.from(iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key_byte, iv_byte);
  let dec = decipher.update(encrypted, 'hex', 'utf-8');
  dec += decipher.final('utf-8');
  return dec;
}

/**
 * 批量加密多个字符串
 * @param {string[]} text_list 不修改原数组
 * @param {string} key 任意长度非空字符串
 * @returns {{encrypted: string[], iv: iv}}
 */
function batch_encrypt_str(text_list, key) {
  if (!text_list || !Array.isArray(text_list)) {
    throw e.get(e.E.INVALID);
  }
  if (!key || key.length === 0) {
    throw e.get(e.E.INVALID.INVALID_SECRET);
  }
  if (text_list.length === 0) {
    return { encrypted: [], iv: '' };
  }
  const first = text_list[0];
  const { encrypted: first_encrypt, iv: iv } = encrypt_str(first, key);
  const encrypted = [first_encrypt];
  text_list.slice(1).forEach(t => {
    encrypted.push(encrypt_str(t, key, iv).encrypted);
  });
  return { encrypted: encrypted, iv: iv };
}

/**
 * @param {string[]} encrypted 加密文本
 * @param {string} key utf-8
 * @param {string} iv hex
 * @returns {string[]}
 */
function batch_decrypt_str(encrypted, key, iv) {
  if (!encrypted || !Array.isArray(encrypted)) {
    throw e.get(e.E.INVALID);
  }
  if (!key || key.length === 0) {
    throw e.get(e.E.INVALID.INVALID_SECRET);
  }
  const decrypted = [];
  encrypted.forEach(en => {
    decrypted.push(decrypt_str(en, key, iv));
  });
  return decrypted;
}

module.exports = {
  encrypt_str: encrypt_str,
  decrypt_str: decrypt_str,
  batch_encrypt_str: batch_encrypt_str,
  batch_decrypt_str: batch_decrypt_str,
};
