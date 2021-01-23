const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser);
app.use(Auth.createSession);



app.get('/', Auth.verifySession,
  (req, res) => {
    res.render('index');
  });


// app.get('/', (req, res) => {
//   Auth.verifySession(req, res, next);
// }, (req, res) => {
//   res.render('index');
// });


// app.get('/',
//   (req, res) => {
//     Auth.verifySession.call(this, req, res, () => res.render('index'));
//   });

app.get('/create', Auth.verifySession,
  (req, res) => {
    res.render('index');
  });

app.get('/links', Auth.verifySession,
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

//app.post('/links', Auth.verifySession(req, res, next),
app.post('/links',
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

app.get('/login',
  (req, res) => {
    res.render('login');
  });

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({ hash: req.session.hash })
    .then(() => {
      res.cookie('shortlyid', null);
      req.session.userId = null;
      res.redirect('/');
    });
});

app.get('/removeAccount', (req, res, next) => {
  models.Sessions.delete({ hash: req.session.hash })
    .then(() => {
      res.cookie('shortlyid', null);
      req.session.userId = null;
    })
    .then(() => {
      models.Users.delete( {username: req.body.username});
      console.log('Account Deleted');
      res.redirect('/');
    });
});
/***********************************************************/
// Write your authentication routes here
/************************************************************/


app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  return models.Users.get({ username: username })
    .then(data => {
      if (data) {
        if (models.Users.compare(password, data.password, data.salt)) {
          console.log('successful login');
          return models.Sessions.update({ hash: req.cookies['shortlyid'] }, { userId: data.id })
            .then((data) => {
              req.session.userId = data.insertId;
              req.session.user = { username: req.body.username };
              console.log('successfully logged in');
              res.redirect('/');

            });
          //successful login
          //start a session for user
        } else {
          res.redirect('/login');
        }
      } else {
        res.redirect('/login');
        console.log('Account information not found!');
        //redirect to signup//unsuccessful login
      }
    })
    .error(error => {
      res.send(error);
    })
    .catch(data => {
      res.redirect('/login');
      res.end();
    });
});

app.post('/signup', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  return models.Users.get({ username: username, password: password })
    .then(data => {
      if (data) {
        console.log('User already exists! Go to Login page.');
        return res.redirect('/login');
      } else {
        if (username.length < 3 || password.length < 5) {
          console.log('Check your input: Username length must exceed 3 characters and password length must exceed 5 characters');
          throw error;
        } else {
          return models.Users.create({ username, password })
            .then((userData) => {
              return models.Sessions.update({ hash: req.session.hash }, { userId: userData.insertId });
            })
            .then((data) => {
              req.session.userId = data.insertId;
              req.session.user = { username: req.body.username };
              res.redirect('/');
            });
        }
      }
    })

    .error(error => {
      if (err.code === 'ER_DUP_ENTRY') {
        res.send(error);
      } else {
        res.send(error);
      }
    })
    .catch(data => {
      res.redirect('/signup');
      next();
    });

});


/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
