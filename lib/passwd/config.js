const fs = require('fs');

/**
 * @typedef {{
  *  port: number
  *  log: {
  *    path: string
  * }
  * }} ServerConfig
  * @description log.path 是相对路径, 相对于app.js所在的路径.
  */

/**
 * @returns {ServerConfig}
 */
function read_cfg() {
  const f = fs.readFileSync(`${__dirname}/setting/server.json`).toString();
  return JSON.parse(f);
}

let cfg = read_cfg();

module.exports = cfg;
