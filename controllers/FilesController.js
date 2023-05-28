import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fs = require('fs');
const { ObjectID } = require('mongodb');

export default class FilesController {
    static async postUpload(req, res){
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        const collection = dbClient.client.db().collection('users');
        const user = await collection.findOne({ _id: new ObjectID(userId) });
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const formData = req.body;
        console.log(formData)
        if (!formData.name){
            res.status(400).json({error: 'Missing name'})
            return;
        }
        if (!formData.type && !['folder', 'file', 'image'].includes(formData.type )){
            res.status(400).json({error: 'Missing type'})
            return;
        }
        if (!formData.data && formData.type !== 'folder'){
            res.status(400).json({error: 'Missing name'})
            return;
        }
        const fileCollection = dbClient.client.db().collection('files');
        if(formData.parentId){
            const file = await fileCollection.findOne({ _id: new ObjectID(formData.parentId) });
            if (!file) {
                res.status(400).json({ error: 'Parent not found' });
                return;
            }
            if (file.type !== 'folder'){
                res.status(400).json({error: 'Parent is not a folder'})
            }
        }
        formData.userId = userId;
        if (formData.type === 'folder'){
            const folder = await fileCollection.insertOne(formData);
            console.log(folder);
            res.status(400).json(folder)
        } else {
            const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
            const encodedString = formData.data;
            const decodedString = Buffer.from(encodedString, 'base64').toString('utf-8');
            const localPath = filePath + `/${formData.name}`;
            fs.writeFile(localPath, decodedString, async (err) => {
                if (err) {
                    console.error('Error creating file:', err);
                    res.status(400).send()
                } else {
                    console.log('File created successfully.');
                    formData.localPath = localPath;
                    const file = await fileCollection.insertOne(formData);
                    console.log(file.ops[0]);
                    res.status(201).json(file.ops[0]);
                }
            })
        }
    }
}