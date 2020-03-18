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
const batch_cfg_name = `batch.json`;
let batch_cache;
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
 * @typedef {{
 *   [key: string]: {
 *      desc: string
 *      choice: {
 *        [key: string]: {
 *          cmd: string
 *          next: string[]
 *        }
 *      }
 *      multi-choice: {
 *        [key: string]: {
 *          cmd: string
 *          next: string[]
 *        }
 *      }
 *   }
 * }} BatchConfig 批处理配置
 */

/**
 * 获取batch配置
 * @returns {BatchConfig}
 * @description 唯一的获取batch的方式
 */
function load_batch() {
  if (batch_cache === undefined) {
    const f = fs.readFileSync(path.join(__dirname, `setting/${batch_cfg_name}`));
    const cfg = JSON.parse(f.toString());
    batch_cache = cfg;
  }
  return batch_cache;
}

/**
 * 列出所有的task名称
 */
function list_batch_task() {
  return Object.keys(load_batch());
}

/**
 * 列出task的选项
 * @param {string} task_name
 * @returns {{
 *  single: boolean
 *  name: string[]
 * }}
 */
function list_batch_task_choice(task_name) {
  const res = { single: false, name: [] };
  const b = load_batch();
  if (b[task_name] === undefined) {
    return res;
  }
  if (b[task_name].choice !== undefined) {
    res.single = true;
    res.name = Object.keys(b[task_name].choice);
  } else if (b[task_name].multi_choice !== undefined) {
    res.single = false;
    res.name = Object.keys(b[task_name].multi_choice);
  }
  return res;
}

/**
 * @param {string} raw_task
 * @return {{cmd:string, next: string}}
 * @description return null if not found
 */
function parse_raw_task(raw_task) {
  const dot_idx = raw_task.indexOf('.');
  if (dot_idx < 0) {
    log(`raw_task=${raw_task}, 里面没'.'啊, 看仔细了`);
    return null;
  }
  const task_name = raw_task.slice(0, dot_idx);
  const choice_name = raw_task.slice(dot_idx + 1);
  if (task_name.length.length === 0 || choice_name.length === 0) {
    log(`raw_task=${raw_task}, 命令错了, 检查一下, 点的左边是task名称, 右边是选项`);
    return null;
  }
  const is_single = list_batch_task_choice(task_name).single;
  const task = load_batch()[task_name];
  if (task === undefined) {
    log(`没获取到task, 你看看${task_name}这个名称对不对`);
    return null;
  }
  const choice_list = is_single ? task.choice : task.multi_choice;
  if (choice_list === undefined) {
    return null;
  }
  const choice = choice_list[choice_name];
  if (choice === undefined) {
    return null;
  }
  return choice;
}

function exec_raw_batch_task(raw_task) {
  let task_list = [parse_raw_task(raw_task)];
  let choice = task_list.pop();
  while (choice !== undefined) {
    log(`--> ${choice.cmd}`);
    const res = shell.exec(choice.cmd);
    if (res.stderr.trim() !== '') {
      log(`错误: ${res.stderr}\n任务终止.`);
      shell.exit();
      return;
    }
    choice.next.forEach(n => {
      task_list.push(parse_raw_task(n));
    });
    choice = task_list.pop();
  }
  log('done!');
}

function exec_batch_task(task_name, choice_name) {
  log(chalk.blue(`开始执行 ${task_name}-${choice_name}.`));
  exec_raw_batch_task(`${task_name}.${choice_name}`);
}

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

exports.exec_batch_task = exec_batch_task;
exports.list_batch_task = list_batch_task;
exports.list_batch_task_choice = list_batch_task_choice;
