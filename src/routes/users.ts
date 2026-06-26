import express from 'express';
import User from '../models/User';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            email: user.email,
            hasApiKey: !!user.geminiApiKey
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// POST /api/users/profile/apikey
router.post('/profile/apikey', authenticate, async (req: AuthenticatedRequest, res): Promise<any> => {
    try {
        const { apiKey } = req.body;
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.geminiApiKey = apiKey ? apiKey.trim() : undefined;
        await user.save();
        
        res.json({
            message: apiKey ? 'API Key saved successfully!' : 'API Key cleared successfully!',
            hasApiKey: !!user.geminiApiKey
        });
    } catch (error) {
        console.error('Error saving API Key:', error);
        res.status(500).json({ error: 'Failed to save API Key' });
    }
});

export default router;
