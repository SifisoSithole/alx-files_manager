import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const crypto = require('crypto');
const { ObjectID } = require('mongodb');

function hashPassword(password) {
  const sha1Hash = crypto.createHash('sha1');
  sha1Hash.update(password);
  const hashedPassword = sha1Hash.digest('hex');
  return hashedPassword;
}

export default class UsersController {
  static async getConnect(req, res) {
    const authorizationHeader = req.headers.authorization;
    const encodedString = authorizationHeader.split(' ')[1];
    const decodedString = Buffer.from(encodedString, 'base64').toString('utf-8');
    const [email, password] = decodedString.split(':');
    const collection = dbClient.client.db().collection('users');
    const user = await collection.find({ email }).toArray();
    if (user.length === 0) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const hashedPassword = hashPassword(password);
    if (user[0].password === hashedPassword) {
      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user[0]._id.toString(), 24 * 60 * 60);
      res.status(200).json({ token });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: new ObjectID(userId) });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}
