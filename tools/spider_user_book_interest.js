#!/usr/bin/env node

/**
 * Update all users in background.
 */
var log = require('debug')('dbj:tool:update');

var User = require('./models/user');
var tasks = require('./tasks');

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
      var u = new User(doc);


      u.listFollowings({
        limit: 24,
        start: undefined
      }, function(err, result) {
        if (err) {
          console.log(err.code);
        }
	if (!result) {
	  console.log(u.id, u.name, 'not result!!!!')
	  return
	}
        result.forEach(function(item) {
	  User.stream({'_id': item.id}, {limit: null}, function(stream) {
	    stream.on('data', function(d) {
	      //console.log(d);
	      var fu = new User(d);
              //console.log(fu);
	      console.log('start to fech', fu.id, fu.name);
              stream.pause();
              fu.pull(function() {
                tasks.interest.collect_book({
                  user: fu, 
                  force: true,
                  fresh: false,
                  success: function() {
                    console.log('Callback sussess for user %s [%s].', fu.uid, fu.name);
                    if (stream.paused) {
                      stream.resume();
                    }
                  },
                  error: function() {
                    console.log('Callback error for user %s [%s].', fu.uid, fu.name);
                    if (stream.paused) {
                      stream.resume();
                    }
                  }
                });
              });
	    });
            //stream.on('close', function() {
            //  console.log('=== Stream closed. ===');
            //  setTimeout(process.exit, 1200);
            //});
        });
	//console.log(result);
      });
    });
  });
  });
}

setTimeout(updateAll, 2000, {
  last_synced_status: {
    $ne: 'ing'
  },
  book_n: {
    $gt: 100
  },
  // 一周之内更新过的用户就不再更新
  last_synced: {
    $lt: new Date(new Date())
  },
});
