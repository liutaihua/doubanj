var util = require('util');

/**
 * some default settings
 */
module.exports = {
  debug: true,

  site_name: '豆瓣酱',

  // the port of the root server
  port: 3344,
  site_root: 'http://yyu.me:3344',
  ssl_root: 'https://yyu.me:3344',
  assets_root: 'http://yyu.me:3344',

  salt: 'keyboardcatndog',

  // the Sentry client auth url
  // neccessray for tracking events in Sentry
  raven: null,

  mongo: {
    dbname: 'doubanj',
    servers: ['127.0.0.1:27017']
  },

  redis: {
    port: '6379',
    host: '127.0.0.1',
    prefix: 'doubanj_',
    // only set default ttl when there is a memory limit 
    ttl: 7 * 24 * 60 * 60, // in seconds
  },

  // 管理员的豆瓣 uid
  admin_users: ['yajc'],

  douban: {
    limit: 10, // request limit per minute
    key: '0118e6db0ecac533034ab4912c604f99',
    secret: 'ed2cd065e095ba9e'
  },
  // more random api keys for public informations
  douban_more: [
    {
      limit: 10,
      key: '',
      secret: ''
    },
  ],

  // google analytics id
  ga_id: ''
};
