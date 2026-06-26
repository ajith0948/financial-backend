import express, { Response } from 'express';
import multer from 'multer';
import { extractFinancialData } from '../services/pdfParser'; 
import Statement from '../models/Statement'; 
import User from '../models/User';
import { dataCache } from '../controllers/statementController';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/', authenticate, upload.single('statement'), async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        console.log(`🤖 Processing: ${req.file.originalname}`);

        // 1. Fetch user to check for custom Gemini API Key
        const user = await User.findById(req.userId);
        const customApiKey = user?.geminiApiKey;

        // 2. Send file to Gemini (passing the custom key if it exists)
        const aiData = await extractFinancialData(req.file.buffer, customApiKey);

        // DEBUG: Print what Gemini sees
        console.log("DEBUG - AI Response:", JSON.stringify(aiData, null, 2));

        // 3. Validation: If it's junk, send 400 error to stop the crash
        if (!aiData) {
            console.log(`⚠️ REJECTED: ${req.file.originalname}`);
            return res.status(400).json({ 
                error: 'Could not extract financial data. The file might be unreadable.' 
            });
        }
        
        // Normalize 'Other' to 'Others'
        if (aiData.category === 'Other') {
            aiData.category = 'Others';
        }

        // 4. Save to MongoDB with the associated userId and optional folderId
        const newStatement = await Statement.create({
            userId: req.userId, 
            originalFileName: req.file.originalname,
            category: aiData.category,
            totalAmount: aiData.totalAmount,
            extractedData: aiData.extractedData,
            folderId: req.body.folderId || undefined
        });

        // 5. Clear user-specific cache
        if (dataCache && typeof dataCache.del === 'function') {
            dataCache.del(`user_dashboard_data_${req.userId}`);
        }

        res.json({ message: 'Success!', data: newStatement });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Server error.' });
    }
});

export default router;