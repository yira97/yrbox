const Router = require('koa-router');
const db = require('../db');
const logger = require('../log').app;

const api = new Router();

api.get('/sites', async ctx => {
  const sites = await db.Site.findAll({
    limit: ctx.query.limit,
    offset: ctx.query.offset,
  }).map(s => s.get());
  ctx.body = sites;
});

api.get('/sites/name', async ctx => {
  const names = await db.Site.findAll({
    attributes: ['name'],
  }).map(n => n.get().name);
  ctx.body = names;
});

api.post('/sites', async ctx => {
  const created = await db.Site.create({
    name: ctx.request.body.name,
    url: ctx.request.body.url,
  }).catch(err => {
    logger.info(`create site error: ${err}`);
    return null;
  });
  if (!created) {
    ctx.body = { error: `create failed.` };
    return;
  }
  ctx.body = created;
});

api.post('/site/url--add', async ctx => {
  const id = Number(ctx.query.id);
  const site = await db.Site.findByPk(id);
  if (!site) {
    ctx.body = { error: 'add url failed. site not exist' };
    return;
  }
  const url = ctx.request.body.url;
  if (!Array.isArray(url) || url.some(u => typeof u !== 'string')) {
    ctx.body = { error: `parameter invalid: ${url}` };
    return;
  }
  site.url = [...site.url, ...url];
  site.save();
  ctx.body = site;
});

api.delete('/site', async ctx => {
  const id = Number(ctx.query.id);
  const site = await db.Site.findByPk(id);
  if (site) {
    site.destroy();
  } else {
    logger.info(`want to delete site data which id = ${id}, but id not exist.`);
  }
  ctx.body = { id: id };
});

api.post('/site/url--rm', async ctx => {
  const id = Number(ctx.query.id);
  const site = await db.Site.findByPk(id);

  site.url = site.url.filter(u => !ctx.request.body.url.includes(u));
  site.save();
  ctx.body = site;
});

api.put('/site/name', async ctx => {
  const id = Number(ctx.query.id);
  const site = await db.Site.findByPk(id);

  site.name = ctx.request.body.name;
  site.save();
  ctx.body = site;
});

api.get('/accounts', async ctx => {
  const accounts = await db.Account.findAll({
    limit: ctx.query.limit,
    offset: ctx.query.offset,
  }).map(a => a.get());
  const accountDict = new Map();
  // 刚才查到的所有账号的信息存入字典
  accounts.forEach(a => accountDict.set(a.id, a));

  // 一级关联的账号也加入到字典.
  // 1) 汇总未知id
  const unknown_id = new Set();

  accounts
    .filter(a => a.childAccountId.length > 0)
    .map(a => a.childAccountId)
    .forEach(cid_list => {
      cid_list.forEach(cid => {
        if (!unknown_id.has(cid) && !accountDict.has(cid)) {
          unknown_id.add(cid);
        }
      });
    });

  const first_relevent_account = await db.Account.findAll({
    where: {
      id: {
        [db.Sequelize.Op.in]: Array.from(unknown_id),
      }
    }
  });
  first_relevent_account.forEach(fra => {
    // 一定没有重复
    accountDict.set(fra.id, fra);
  });

  accounts.forEach(a => {
    const childs = [];
    a.childAccountId.forEach(cid => {
      const child = accountDict.get(cid);
      // 因为一部分account中存储的childAccountId已失效
      // 所以accountDict中不能保证cid都能找的到
      if (!child) { return; }
      // 不应直接添加引用, 会递归.
      childs.push({
        id: child.id,
        username: child.username,
        password: child.password,
        phone: child.phone,
        email: child.email,
        note: child.note,
        tag: child.tag,
      });
    });
    a.childAccount = childs;
  });
  ctx.body = accounts;
});

api.post('/accounts', async ctx => {
  const body = ctx.request.body;
  const account = await db.Account.create({
    username: body.username,
    siteId: body.siteId,
    password: body.password,
    phone: body.phone,
    email: body.email,
    region: body.region,
    note: body.note,
    tag: body.tag,
    childAccountId: body.childAccountId,
  });
  ctx.body = account.get();
});

api.put('/account/:key', async ctx => {
  const id = Number(ctx.query.id);
  const account = await db.Account.findByPk(id);

  const valid_key = [
    'siteId',
    'username',
    'password',
    'phone',
    'email',
    'region',
    'tag',
    'note',
    'childAccountId'
  ];

  const key = ctx.params.key;

  if (!valid_key.includes(key)) {
    ctx.body = { error: `invalid key not support ${key}` };
    return;
  }

  if (ctx.request.body[key] === undefined) {
    ctx.body = { error: `request body doesn't contains ${key} key` };
    return;
  }
  account[key] = ctx.request.body[key];
  account.save();
  ctx.body = account.get();
});

module.exports = api;
