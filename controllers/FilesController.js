import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');
const { ObjectID } = require('mongodb');

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const userId = new ObjectID(await redisClient.get(`auth_${token}`));
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const formData = req.body;
    if (!formData.name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    if (!formData.type && !['folder', 'file', 'image'].includes(formData.type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }
    if (!formData.data && formData.type !== 'folder') {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    const fileCollection = dbClient.client.db().collection('files');
    if (formData.parentId && formData.parentId !== '0') {
      formData.parentId = new ObjectID(formData.parentId);
      const file = await fileCollection.findOne({ _id: formData.parentId });
      if (!file) {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (file.type !== 'folder') {
        res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (!formData.isPublic) {
      formData.isPublic = false;
    }
    if (!formData.parentId) {
      formData.parentId = '0';
    }
    formData.userId = userId;
    if (formData.type === 'folder') {
      let folder = await fileCollection.insertOne(formData);
      folder = folder.ops[0];
      res.status(400).json({
        id: folder._id,
        userId: folder.userId,
        name: folder.name,
        type: folder.type,
        isPublic: folder.isPublic,
        parentId: folder.parentId,
      });
    } else {
      const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const encodedString = formData.data;
      delete formData.data;
      const decodedString = Buffer.from(encodedString, 'base64').toString('utf-8');
      const fileName = uuidv4();
      const localPath = `${filePath}/${fileName}`;
      fs.writeFile(localPath, decodedString, async (err) => {
        if (err) {
          res.status(400).json({ error: 'Failed to create' });
        } else {
          formData.localPath = localPath;
          let file = await fileCollection.insertOne(formData);
          file = file.ops[0];
          res.status(201).json({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId,
          });
        }
      });
    }
  }
}
