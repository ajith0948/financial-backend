import { Response } from 'express';
import NodeCache from 'node-cache';
import Statement from '../models/Statement'; // Connects to your existing model
import { AuthenticatedRequest } from '../middleware/auth';

// Create the cache (data expires after 10 minutes)
export const dataCache = new NodeCache({ stdTTL: 600 }); 

export const getUserStatements = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const cacheKey = `user_dashboard_data_${req.userId}`; 
        
        // 1. CHECK THE CACHE (The "RAM Desk")
        const cachedData = dataCache.get(cacheKey);
        if (cachedData) {
            console.log("⚡ Served instantly from RAM!");
            return res.json(cachedData);
        }

        // 2. NOT IN CACHE? FETCH FROM MONGODB (The "Bookshelf")
        console.log("🐌 Fetching from MongoDB...");
        const statements = await Statement.find({ userId: req.userId }).sort({ processedAt: -1 });

        // 3. SAVE TO CACHE FOR NEXT TIME
        dataCache.set(cacheKey, statements);

        res.json(statements);
    } catch (error) {
        console.error("Cache Error:", error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
};

export const deleteStatement = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        
        // 1. Delete from MongoDB (ensure statement belongs to the authenticated user)
        const deletedDoc = await Statement.findOneAndDelete({ _id: id, userId: req.userId });
        if (!deletedDoc) {
            return res.status(404).json({ error: 'Document not found or unauthorized' });
        }

        // 2. CRITICAL: Clear the user-specific RAM Cache! 
        dataCache.del(`user_dashboard_data_${req.userId}`); 

        res.json({ message: 'Document deleted successfully and cache cleared!' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
