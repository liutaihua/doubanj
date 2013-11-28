#!/usr/bin/env node

/**
 * Update all users in background.
 */
var log = require('debug')('dbj:tool:update');

var User = require('../models/user');
var tasks = require('../tasks');

tasks._keyprefix('dbj-cron-update-');

var oneday = 60 * 60 * 24 * 1000;
var oneweek = oneday * 7;

function updateAll(query) {
  var now = new Date();

  if (tasks.interest.queue.queue.length) {
    console.log('There are unfinished task. Exit.');
    return;
  }

  User.stream(query, { limit: null }, function(stream) {
    stream.on('data', function(doc) {
      console.log(doc._id);
      var u = new User(doc);

      stream.pause();

      u.pull(function() {
        tasks.interest.collect_book({
          user: u, 
          force: true,
          fresh: false,
          success: function() {
            console.log('Callback sussess for user %s [%s].', u.uid, u.name);
            if (stream.paused) {
              stream.resume();
            }
          },
          error: function() {
            console.log('Callback error for user %s [%s].', u.uid, u.name);
            if (stream.paused) {
              stream.resume();
            }
          }
        });
      });
      console.log('Queue user %s [%s]', u.uid, u.name);
    });
    stream.on('close', function() {
      console.log('=== Stream closed. ===');
      setTimeout(process.exit, 1200);
    });
  });
}

setTimeout(updateAll, 2000, {
  last_synced_status: {
    $ne: 'ing'
  },
  book_n: {
    $gt: 1
  },
  // 一周之内更新过的用户就不再更新
  last_synced: {
    $lt: new Date(new Date())
  },
});
