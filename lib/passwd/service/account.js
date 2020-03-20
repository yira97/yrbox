const { Account, Sequelize } = require('../db');
const { appLoger } = require('../log');
/**
 * @typedef {{
 *   id: number
 *   updateAt: string,
 *   createAt: string,
 *   siteId: number,
 *   username: string,
 *   password: string,
 *   phone: string,
 *   email: string,
 *   region: string,
 *   tag: string[],
 *   note: string,
 *   childAccountId: number[],
 *   childAccount: {
 *     id: number,
 *     username: string,
 *     password: string,
 *     phone: string,
 *     email: string,
 *     note: string,
 *     tag: string[]
 * }[]
 * }} AccountModel
 */

/**
 * @param {number} limit
 * @param {number} offset
 * @returns {AccountModel[]}
 */
async function list_accounts(limit, offset) {
  const accounts = await Account.findAll({
    limit: limit,
    offset: offset,
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

  const first_relevent_account = await Account.findAll({
    where: {
      id: {
        [Sequelize.Op.in]: Array.from(unknown_id),
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
  return accounts;
}

/**
 * @param {} param0
 */
async function create_account({ username, siteId, password, phone, email, region, note, tag, childAccountId }) {
  const account = await Account.create({
    username: username,
    siteId: siteId,
    password: password,
    phone: phone,
    email: email,
    region: region,
    note: note,
    tag: tag,
    childAccountId: childAccountId,
  }).catch(err => {
    appLoger.info(`create account failed. ${err}`);
    return null;
  });
  if (!account) {
    return null;
  }
  return account.get();
}

async function update_account_field(account_id, key, new_value) {
  const account = await Account.findByPk(account_id);
  if (!account) { return null; }

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

  if (!valid_key.includes(key)) {
    appLoger(`invalid key not support account_id=${account_id}, key=${key}, new_value=${new_value}`);
    return;
  }

  account[key] = new_value;
  await account.save();
  return account.get();
}

module.exports = {
  list_accounts: list_accounts,
  create_account: create_account,
  update_account_field: update_account_field,
};
