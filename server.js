import router from './routes';

const express = require('express');

const port = process.env.PORT || 5000;

const app = express();
app.use(router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
