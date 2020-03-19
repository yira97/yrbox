const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const logger = require('./log').app;
const cfg = require('./config');
const router = require('./route');

const app = new Koa();

function getLog() {
  return async function (ctx, next) {
    logger.info(ctx.method, ctx.header.host + ctx.url);
    await next();
  };
}

app
  .use(bodyParser())
  .use(getLog())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(cfg.port);

logger.info(`server is starting at port ${cfg.port}`);
