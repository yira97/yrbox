const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const { appLoger } = require('./log');
const cfg = require('./config');
const router = require('./route');
const views = require('koa-views');
const path = require('path');

const app = new Koa();

function getLog() {
  return async function (ctx, next) {
    appLoger.info(ctx.method, ctx.header.host + ctx.url);
    await next();
  };
}

app
  .use(views(path.join(__dirname, './view'), {
    extension: 'ejs',
  }))
  .use(app.stat)
  .use(bodyParser())
  .use(getLog())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(cfg.port);

appLoger.info(`server is starting at port ${cfg.port}`);
