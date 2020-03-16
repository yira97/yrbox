const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const chalk = require('chalk');
const { Client } = require('pg');
const inquirer = require('inquirer');
const e = require('../errors');
const log = console.log;

const database_cfg_name = `db.json`;
const ssh_cfg_name = `ssh.json`;

/**
 * @typedef {{
 *  dialect: string
 *  host: string
 *  port: number
 *  user: string
 *  password: string
 *  database: string
 *  name: string
 *  tag: string[]
 * }} DataBaseConfig 数据库配置
 */

/**
 * 获取数据库配置
 * @returns {DataBaseConfig[]} cfgs
 */
function list_database_config() {
  const f = fs.readFileSync(path.join(__dirname, `setting/${database_cfg_name}`));
  const cfg = JSON.parse(f.toString());
  return cfg;
}

/**
 * @typedef {{
 *  host: string
 *  port: number
 *  user: string
 *  password: string
 *  name: string
 *  private_key: string
 *  tag: string[]
 * }} SshConfig SSH配置
 */

/**
 * 获取ssh配置
 * @returns {SshConfig}
 */
function list_ssh_config() {
  const f = fs.readFileSync(path.join(__dirname, `setting/${ssh_cfg_name}`));
  const cfg = JSON.parse(f.toString());
  return cfg;
}

/**
 * 生成psql命令
 * @param {string} host
 * @param {number} port
 * @param {string} user
 * @param {string} password
 * @param {string} database
 * @returns {string}
 */
function psql_cmd(host, port, user, password, database = '') {
  let cmd = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${user} `;
  if (database !== '') {
    cmd += ` -d ${database} `;
  }
  return cmd;
}

/**
 * 生成ssh命令
 * @param {string} host 地址
 * @param {number} port 端口
 * @param {string} user 用户名
 * @param {string} private_key 私钥路径
 * @returns {string}
 */
function ssh_cmd(host, port, user, private_key = '') {
  // -Tq 解除伪终端限制
  let cmd = `ssh ${user}@${host} `;
  if (port !== 22) {
    cmd += ` -p ${port} `;
  }
  if (private_key !== '') {
    cmd += ` -i ${private_key} `;
  }
  return cmd;
}

/**
 * 获取标准数据库名称
 * @param {string} dia
 * @returns {'postgres' | 'mysql'}
 * @description 如果没找到, 返回null
 */
function get_dialect(dia) {
  dia = dia.toLowerCase();
  switch (dia) {
    case 'pg':
    case 'postgres':
      dia = 'postgres';
      break;
    case 'mysql':
      dia = 'mysql';
      break;
    default:
      dia = '';
      break;
  }
  return dia;
}

/**
 * 手动连接数据库
 * @param {DataBaseConfig} db
 * @returns {Promise<boolean>}
 */
async function manual_connect(db) {
  const dia = get_dialect(db.dialect);
  let cmd;
  switch (dia) {
    case 'postgres':
      cmd = psql_cmd(db.host, db.port, db.user, db.database);
      break;
    default:
      break;
  }
  if (dia === null) {
    shell.echo(`数据库dialect错误. dialect=${db.dialect}`);
    shell.exit();
  }
  if (cmd === undefined) { throw e.get(e.E.NO_MATCH.NO_MATCH_COMMAND); }
  log(`🙈 复制粘贴: ` + chalk.black(cmd));
  return new Promise(res => res(true));
}

/**
 * @param {DataBaseConfig} db
 * @returns {Promise<null}
 * @tutorial
 * `\q` 退出
 * `\d <table-name>` 显示表结构
 */
async function postgres_connect(db) {
  const client = new Client({
    user: db.user,
    host: db.host,
    database: db.database,
    password: db.password,
    port: db.port,
  });
  await client.connect();
  let running = true;
  while (running) {
    await inquirer
      .prompt([{
        type: 'input',
        name: 'sql',
        message: chalk.bold(`🔍 :`),
      }])
      .then(async ans => {
        let sql = `${ans.sql}`;
        if (sql === '\\q') {
          client.end();
          running = false;
          return;
        }
        if (sql.indexOf('\\d') === 0) {
          const split = sql.split(' ');
          const table = split[split.length - 1].trim();
          await client
            .query(`select * from ${table} limit 1`)
            .then(res => {
              res.fields.forEach(f => {
                log(`name: ` + chalk.green(`${f.name}`) + `, format: ` + chalk.green(`${f.format}`));
              });
            })
            .catch(err => {
              log(chalk.red(`内部错误: ${err}`));
            });
          return;
        }
        await client.query(sql)
          .then(res => {
            res.rows.forEach(r => {
              log(JSON.stringify(r));
            });
          })
          .catch(err => {
            log(chalk.red(`错误: ${err.message}`));
          });
      });
  }
  shell.echo('bye~👋');
  shell.exit();
}

/**
 * 连接数据库
 * @param {DataBaseConfig} db
 * @returns {Promise<null>}
 */
async function connect(db) {
  const dia = get_dialect(db.dialect);
  switch (dia) {
    case 'postgres':
      await postgres_connect(db);
      break;
    default:
      break;
  }
}

/**
 * 远程连接
 * @param {SshConfig} cfg
 * @returns {Promise<null>}
 */
async function ssh(cfg) {
  const cmd = ssh_cmd(cfg.host, cfg.port, cfg.user, cfg.private_key);
  log(`🙈 复制粘贴: ` + chalk.black(cmd));
  return new Promise(res => res());
}

exports.list_database_config = list_database_config;
exports.manual_connect = manual_connect;
exports.connect = connect;
exports.ssh = ssh;
exports.list_ssh_config = list_ssh_config;
