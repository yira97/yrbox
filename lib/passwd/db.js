const Sequelize = require('sequelize');
const Model = Sequelize.Model;
const logger = require('./log').db;

const seq = new Sequelize({
  dialect: 'sqlite',
  storage: `${__dirname}/store/store.sqlite`,
  define: {
    freezeTableName: true,
  },
  logging: (msg) => logger.info(msg),
});

const array_separator = '|';

function test_connection() {
  seq
    .authenticate()
    .then(() => {
      console.log('connection has been established successfully.');
    })
    .catch(err => {
      console.error('Unable to connect to the database: ', err);
    });
}

// 自动生成: id, createAt, updateAt
class Site extends Model { }
Site.init({
  name: {
    type: Sequelize.STRING({
      length: 255
    }),
    unique: true,
    allowNull: false,
  },
  url: {
    type: Sequelize.STRING,
    allowNull: true,
    comment: `array, separation character is ${array_separator}`,
    get() {
      // 只返回 string[]
      const data = this.getDataValue('url');
      if (data === null || data === undefined) {
        return [];
      }
      return data.split(array_separator);
    },
    set(val) {
      // 只接受string[]
      if (!Array.isArray(val) || val.length > 0 && typeof val[0] !== 'string') {
        return;
      }
      if (val.length === 0) {
        this.setDataValue('url', undefined);
        return;
      }
      this.setDataValue('url', val.join(array_separator));
    }
  }
}, {
  sequelize: seq,
  modelName: 'site',
  timestamps: true,
  freezeTableName: true,
});

// 自动生成: id, createAt, updateAt
class Account extends Model { }
Account.init({
  siteId: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  username: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  password: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  phone: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      isNumeric: true,
    },
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    },
  },
  region: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  tag: {
    type: Sequelize.STRING,
    allowNull: true,
    comment: `array, separation character is ${array_separator}`,
    get() {
      // 只返回 string[]
      const data = this.getDataValue('tag');
      if (data === null || data === undefined) {
        return [];
      }
      return data.split(array_separator);
    },
    set(val) {
      // 只接受string[]
      if (!Array.isArray(val) || val.length > 0 && typeof val[0] !== 'string') {
        return;
      }
      if (val.length === 0) {
        this.setDataValue('tag', undefined);
        return;
      }
      this.setDataValue('tag', val.join(array_separator));
    }
  },
  note: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  childAccountId: {
    type: Sequelize.STRING,
    allowNull: true,
    comment: `array, separation character is ${array_separator}`,
    get() {
      // 只返回 number[]
      const data = this.getDataValue('childAccountId');
      if (data === null || data === undefined) {
        return [];
      }
      const cid_list = data.split(array_separator).map(s => Number(s));
      return cid_list;
    },
    set(val) {
      // 只接受number[]
      if (!Array.isArray(val) || val.length > 0 && typeof val[0] !== 'number') {
        return;
      }
      if (val.length === 0) {
        this.setDataValue('childAccountId', undefined);
        return;
      }
      this.setDataValue('childAccountId', val.join(array_separator));
    }
  }
}, {
  sequelize: seq,
  modelName: 'account',
  timestamps: true,
  freezeTableName: true,
});

// 自动创建所有表, 但不覆盖
seq.sync({ force: false });

exports.Site = Site;
exports.Account = Account;
exports.test_connection = test_connection;
exports.Sequelize = Sequelize;
