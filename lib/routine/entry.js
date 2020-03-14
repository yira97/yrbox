const program = require('commander');
const lib = require('./index');
const chalk = require('chalk');
var inquirer = require('inquirer');
const log = console.log;

const prog = new program.Command();
prog
  .option('--db', '连接数据库')
  .option('--ssh', '连接主机')
  .option('--manual', '手动操作')
  .parse(process.argv);

if (prog.db) {
  if (prog.manual) {
    log(chalk.magenta('连接数据库[手动:PSQL]'));
  } else {
    log(chalk.magenta('连接数据库[模拟:node-postgres]'));
  }
  const db_list = lib.list_database_config();
  inquirer
    .prompt([
      {
        type: "list",
        name: 'name',
        message: chalk.bold(`🗄 请选择想要连接的数据库`),
        choices: db_list.map(db => `${db.name}`),
      }
    ])
    .then(ans => {
      const db = db_list.find(d => d.name === ans.name);
      if (!db) { throw new Error('unreachable'); }
      if (prog.manual) {
        lib.manual_connect(db);
      } else {
        lib.connect(db);
      }
    });
}

if (prog.ssh) {
  log(chalk.magenta('远程登陆...'));
  inquirer.prompt([
    {

    }
  ])
}
