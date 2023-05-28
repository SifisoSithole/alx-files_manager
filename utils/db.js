import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const {
      DB_HOST = 'localhost',
      DB_PORT = '27017',
      DB_DATABASE = 'files_manager',
    } = process.env;
    const url = `mongodb://${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
    console.log(url);
    this.client = new MongoClient(url);
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.client.db().collection('users').countDocuments();
  }

  async nbFiles() {
    return this.client.db().collection('files').countDocuments();
  }

}

const dbClient = new DBClient();
module.exports = dbClient;
