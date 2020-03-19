const Router = require('koa-router');
const api = require('./api');

const router = new Router();

router.use('/api/v1', api.routes(), api.allowedMethods());

module.exports = router;
