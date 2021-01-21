const parseCookies = (req, res, next) => {
  var cookieObj = {};
  //cookie is a piece of data sent from server to user's browser

  if (req.headers.cookie) {
    var cookies = req.headers.cookie.split('; ');
    //split cookie header on ';'
    cookies.forEach((cookie) => {
      var cookieArray = cookie.split('=');
      cookieObj[cookieArray[0]] = cookieArray[1];
    });
    //for each split, split again on '='
    //parse cookieObj[split[0]] = split[1]

  }
  //if it exists, parse them into obj and assign to a cookies prop on req
  //send back req.cookies = cookieObj;
  req.cookies = cookieObj;
  next();
  //req.header.cookie === undefined (cookie obj is empty)
};

module.exports = parseCookies;