const Router = require('koa-router');
const { is_array_of_string } = require('../../type_check');
const {
  list_sites,
  get_all_sites_name,
  create_site,
  add_url,
  delete_site,
  remove_url,
  update_site_name,
} = require('../service/site');
const {
  list_accounts,
  create_account,
  update_account_field,
} = require('../service/account');

const api = new Router();

api.get('/sites', async ctx => {
  const { limit, offset } = ctx.query;
  const sites = await list_sites(limit, offset);
  ctx.body = sites;
});

api.get('/sites/name', async ctx => {
  const names = await get_all_sites_name();
  ctx.body = names;
});

api.post('/sites', async ctx => {
  const { name, url } = ctx.request.body;
  const created = await create_site(name, url);
  if (!created) {
    ctx.body = { error: `create failed.` };
    return;
  }
  ctx.body = created;
});

api.post('/site/url--add', async ctx => {
  const { id } = Number(ctx.query);
  const { url } = ctx.request.body;
  if (!is_array_of_string(url)) {
    ctx.body = { error: `parameter invalid: ${url}` };
    return;
  }

  const site = await add_url(id, url);
  if (!site) {
    ctx.body = { error: 'add url failed. site not exist' };
    return;
  }

  ctx.body = site;
});

api.delete('/site', async ctx => {
  const id = Number(ctx.query.id);
  delete_site(id);
  ctx.body = { id: id };
});

api.post('/site/url--rm', async ctx => {
  const id = Number(ctx.query.id);
  const { url } = ctx.request.body;
  if (!is_array_of_string(url)) {
    ctx.body = { error: `invalid parameter url: ${url}` };
    return;
  }
  const site = await remove_url(id, url);
  if (!site) {
    ctx.body = { error: `nothing changed. site_id not exist:${id}` };
  }
  ctx.body = site;
});

api.put('/site/name', async ctx => {
  const id = Number(ctx.query.id);
  const { name } = ctx.request.body;
  const site = await update_site_name(id, name);
  if (!site) {
    ctx.body = { error: `nothing changed. site_id not exist: ${id}` };
    return;
  }
  ctx.body = site;
});

api.get('/accounts', async ctx => {
  const { limit, offset } = ctx.query;
  const accounts = await list_accounts(limit, offset);
  ctx.body = accounts;
});

api.post('/accounts', async ctx => {
  const body = ctx.request.body;
  const account = await create_account(body);
  if (!account) {
    ctx.body(`create account failed.`);
    return;
  }
  ctx.body = account;
});

api.put('/account/:key', async ctx => {
  const id = Number(ctx.query.id);
  const key = ctx.params.key;
  if (ctx.request.body[key] === undefined) {
    ctx.body = { error: `request body doesn't contains ${key} key` };
    return;
  }
  const value = ctx.request.body[key];

  const account = await update_account_field(id, key, value);
  if (!account) {
    ctx.body(`nothing changed.`);
    return;
  }
  ctx.body = account;
});

module.exports = api;
