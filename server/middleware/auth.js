const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  //receive request with or without cookie
  if (req.cookies && req.cookies.shortlyid) {
    console.log(req.cookies);
    var hash = req.cookies.shortlyid;
    return models.Sessions.get({ hash })
      .then((data) => {
        if (data) {
          req.session = data;
          res.cookie('shortlyid', req.session.hash);
          var id = data.userId;
          if (id) {
            req.session.userId = id;
            models.Users.get({ id })
              .then((userData) => {
                req.session.user = { username: userData.username };
                next();
              });
          } else {
            next();
          }
        } else {
          //when there is no record in SESSIONS table matching the hash
          //create a new session
          return models.Sessions.create()
            .then((newSession) => {
              // assign req's cookie to the new session value
              var id = newSession.insertId;
              return models.Sessions.get({ id });
            })
            .then((sessionData) => {
              req.session = sessionData;
              res.cookie('shortlyid', req.session.hash);
              next();
            });
        }
      });
  } else {
    return models.Sessions.create()
      .then((newSession) => {
        var id = newSession.insertId;
        return models.Sessions.get({ id });
      })
      .then((sessionData) => {
        req.session = sessionData;
        res.cookie('shortlyid', req.session.hash);
      })
      .then(() => {
        var username = req.body.username;
        req.session.user = { username };
        return models.Users.get({ username });
      })
      .then((userData) => {
        if (userData && userData.id) {
          req.session.userId = userData.id;
        }
        next();
      });
  }
};
//with cookie, look up in db (use Sessions.get)
//if there is a valid entry in the table, get the user ID and use it to assign to the sessions property
//if there is no valid entry in the table, ??

//without cookie, generates a session with a unique hash/store in sessions table, set a cookie in response header


/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
