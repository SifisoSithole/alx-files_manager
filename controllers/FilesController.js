import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull/lib/queue';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');
const { ObjectID } = require('mongodb');
const mime = require('mime-types');

const fileQueue = new Queue('thumbnail generation');

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
      // eslint-disable-next-line
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
          // eslint-disable-next-line
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

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = new ObjectID(await redisClient.get(`auth_${token}`));
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const documentId = new ObjectID(req.params.id);
    const fileCollection = dbClient.client.db().collection('files');
    const file = await fileCollection.findOne({ _id: documentId });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = new ObjectID(await redisClient.get(`auth_${token}`));
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    let { parentId } = req.query;
    if (!parentId) parentId = '0';
    let page = req.query.page || '0';
    // eslint-disable-next-line
    page = parseInt(page);
    const noPages = 20;
    const fileCollection = dbClient.client.db().collection('files');
    const file = await fileCollection.find({ parentId: new ObjectID(parentId) })
      .skip(page * noPages)
      .limit(noPages)
      .toArray();
    const files = [];
    for (let i = 0; i < file.length; i += 1) {
      files.push({
        id: file[i]._id,
        userId: file[i].userId,
        name: file[i].name,
        type: file[i].type,
        isPublic: file[i].isPublic,
        parentId: file[i].parentId,
      });
    }
    res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = new ObjectID(await redisClient.get(`auth_${token}`));
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const fileCollection = dbClient.client.db().collection('files');
    let file = await fileCollection.updateOne(
      { _id: new ObjectID(req.params.id), userId: user._id },
      { $set: { isPublic: true } },
    );
    if (file.matchedCount === 1) {
      file = await fileCollection.findOne({ _id: new ObjectID(req.params.id) });
      res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = new ObjectID(await redisClient.get(`auth_${token}`));
    const collection = dbClient.client.db().collection('users');
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const fileCollection = dbClient.client.db().collection('files');
    let file = await fileCollection.updateOne(
      { _id: new ObjectID(req.params.id), userId: user._id },
      { $set: { isPublic: false } },
    );
    if (file.matchedCount === 1) {
      file = await fileCollection.findOne({ _id: new ObjectID(req.params.id) });
      res.status(200).json({
        id: file._id,
        userId: file.userId,
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId,
      });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }

  static async getFile(req, res) {
    const fileCollection = dbClient.client.db().collection('files');
    const file = await fileCollection.findOne({ _id: new ObjectID(req.params.id) });
    if (!file) {
      res.status(404).json({ error: 'Not found' });
    }
    if (!file.isPublic) {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      console.log(file.userId, userId);
      if (file.userId.toString() !== userId) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
    }

    fs.readFile(file.localPath, 'utf-8', (err, data) => {
      if (err) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.setHeader('Content-Type', mime.lookup(file.name));
      res.status(200).send(data);
    });
  }
}
