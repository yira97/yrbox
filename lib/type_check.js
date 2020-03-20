
/**
 *
 * @param {any} v
 * @returns {boolean}
 */
function is_array_of_string(v) {
  if (!Array.isArray(v)) {
    return false;
  }
  if (v.some(o => typeof o !== 'string')) {
    return false;
  }
  return true;
}

module.exports = {
  is_array_of_string: is_array_of_string,
};
