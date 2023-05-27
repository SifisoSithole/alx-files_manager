import dbClient from '../utils/db';

const crypto = require('crypto');

function hashPassword(password) {
  const sha1Hash = crypto.createHash('sha1');
  sha1Hash.update(password);
  const hashedPassword = sha1Hash.digest('hex');
  return hashedPassword;
}

export default class UsersController {
  static async postNew(req, res) {
    const formData = req.body;
    const { email } = formData;
    const { password } = formData;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    const collection = dbClient.client.db().collection('users');
    const result = await collection.find({ email }).toArray();
    if (result.length !== 0) {
      res.status(400).json({ error: 'Already exist' });
      return;
    }

    const hashedPassword = hashPassword(password);
    const user = {
      email,
      password: hashedPassword,
    };
    const id = await collection.insertOne(user);
    console.log(id.insertedId);
    res.status(201).json({
      id: id.insertedId,
      email,
    });
  }
}
