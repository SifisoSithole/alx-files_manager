import dbClient from '../utils/db';

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
        
    }
}