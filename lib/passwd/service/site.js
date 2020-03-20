const { Site } = require('../db');
const { appLoger } = require('../log');

/**
 * @typedef {{
 *  id: number,
 *  updateAt: string,
 *  createAt: string,
 *  name: string,
 *  url: string[],
 * }} SiteModel
 */

/**
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<SiteModel[]>}
 */
async function list_sites(limit, offset) {
  const sites = await Site.findAll({
    limit: limit,
    offset: offset,
  }).map(s => s.get());
  return sites;
}

/**
 * @returns {Promise<string[]>}
 */
async function get_all_sites_name() {
  const names = await Site.findAll({
    attributes: ['name'],
  }).map(n => n.get().name);
  return names;
}

/**
 * @param {string} name
 * @param {string[]} url
 * @returns {Promise<void | SiteModel>}
 */
async function create_site(name, url) {
  const created = await Site.create({
    name: name,
    url: url,
  }).catch(err => {
    appLoger.info(`create site error: ${err}`);
    return null;
  });
  return created.get();
}

/**
 * @param {number} site_id
 * @param {string[]} url
 * @returns {Promise<SiteModel | void>}
 */
async function add_url(site_id, url) {
  const site = await Site.findByPk(site_id);
  if (!site) {
    return null;
  }
  site.url = [...site.url, ...url];
  await site.save();
  return site.get();
}

/**
 * @param {number} site_id
 * @returns {Promise<boolean>}
 */
async function delete_site(site_id) {
  const site = await Site.findByPk(site_id);
  if (site) {
    await site.destroy();
  }
  return true;
}


/**
 * @param {number} site_id
 * @param {string} url
 * @returns {Promise<SiteModel | void>}
 */
async function remove_url(site_id, url) {
  const site = await Site.findByPk(site_id);
  if (!Site) {
    return null;
  }
  site.url = site.url.filter(u => !url.includes(u));
  await site.save();
  return site.get();
}

/**
 * @param {number} site_id
 * @param {string} name
 * @returns {Promise<SiteModel | void}
 */
async function update_site_name(site_id, name) {
  const site = await Site.findByPk(site_id);
  if (!site) { return null; }
  site.name = name;
  await site.save();
  return site.get();
}

module.exports = {
  list_sites: list_sites,
  get_all_sites_name: get_all_sites_name,
  create_site: create_site,
  add_url: add_url,
  delete_site: delete_site,
  remove_url: remove_url,
  update_site_name: update_site_name,
};
