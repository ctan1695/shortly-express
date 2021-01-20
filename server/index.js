const app = require('./app.js');
const db = require('./db');
const port = 5500;

app.listen(port, () => {
  console.log(`Shortly is listening on ${port}`);
});
