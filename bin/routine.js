const program = require('commander');
const lib = require('../lib/routine');
const chalk = require('chalk');
var inquirer = require('inquirer');
const e = require('../lib/errors');
const { routineCli } = require('../lib/logger');

const prog = new program.Command();
prog
  .command('db')
  .option('-m --manual', '手动连接')
  .action(param => {
    if (param.manual) {
      routineCli.info(chalk.magenta('连接数据库[手动:PSQL]'));
    } else {
      routineCli.info(chalk.magenta('连接数据库[模拟:node-postgres]'));
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
        if (!db) { throw e.E.UNREACHABLE; }
        if (param.manual) {
          lib.manual_connect(db);
        } else {
          lib.connect(db);
        }
      });
  });

prog
  .command('ssh')
  .description('远程连接')
  .action(() => {
    routineCli.info(chalk.magenta('远程登陆...'));
    const ssh = lib.list_ssh_config();
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'name',
          message: chalk.bold(`☁️ 请选择想要连接的主机`),
          choices: ssh.map(cfg => cfg.name),
        }
      ])
      .then(ans => {
        const ssh_cfg = ssh.find(cfg => cfg.name === ans.name);
        if (!ssh_cfg) { throw e.get(e.E.UNREACHABLE); }
        lib.ssh(ssh_cfg);
      });
  });

prog
  .command('batch')
  .description(`捷径`)
  .action(() => {
    const task_name_list = lib.list_batch_task();
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'task_name',
          message: chalk.bold(`📃 布置一个任务`),
          choices: task_name_list,
        }
      ])
      .then(ans => {
        const choice_list = lib.list_batch_task_choice(ans.task_name);
        if (choice_list.name.length === 0) {
          routineCli.info('该任务没有目标.\n');
          process.exit(0);
        }
        inquirer
          .prompt([
            {
              type: choice_list.single ? 'list' : 'checkbox',
              name: 'choice',
              message: chalk.bold(`选择参数`),
              choices: choice_list.name,
            }
          ])
          .then(ans2 => {
            const choice = Array.isArray(ans2.choice) ? ans2.choice : [ans2.choice];
            choice.forEach(c => {
              lib.exec_batch_task(ans.task_name, c);
            });
          });
      });
  });

prog.parse(process.argv);
