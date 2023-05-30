import router from './routes';

const express = require('express');
const fs = require('fs');

const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(router);

function preServerSetup() {
  const directoryPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
  }
}

preServerSetup();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
