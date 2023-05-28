import dbClient from '../utils/db';

export default class FilesController {
    static async postUpload(req, res){
        const user = await dbClient.getUserFromToken(req.headers['x-token']);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
    }
}