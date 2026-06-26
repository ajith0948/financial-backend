import express from 'express';
import Folder from '../models/Folder';
import Statement from '../models/Statement';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/folders
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
        const folders = await Folder.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json(folders);
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// POST /api/folders
router.post('/', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
    try {
        const { name, color } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Folder name is required' });
        }
        
        const folder = await Folder.create({
            userId: req.userId,
            name,
            color: color || '#3b82f6'
        });
        res.status(201).json(folder);
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// DELETE /api/folders/:id
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
    try {
        const { id } = req.params;
        
        // Find and delete folder (ensure it belongs to user)
        const deletedFolder = await Folder.findOneAndDelete({ _id: id, userId: req.userId });
        if (!deletedFolder) {
            return res.status(404).json({ error: 'Folder not found or unauthorized' });
        }
        
        // Unset folderId on all statements that belonged to this folder
        await Statement.updateMany(
            { userId: req.userId, folderId: id },
            { $unset: { folderId: "" } }
        );
        
        res.json({ message: 'Folder deleted and statement references cleared!' });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

export default router;
