import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import statementRoutes from './routes/statements';
import uploadRoutes from './routes/upload';

// Import our custom modules
import './queue/PdfWorker.js';
import { StatementModel } from './models/Statement.js'; // 👈 Fixed duplicate import
import authRouter from './routes/auth.js';
import folderRoutes from './routes/folders';
import userRoutes from './routes/users';
import { authenticate, AuthenticatedRequest } from './middleware/auth';
import User from './models/User';

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARE (The Translators & Security)
// ==========================================
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// THIS MUST BE HERE! It translates the React data before the routes see it.
app.use(express.json());
app.use(cookieParser());
app.use(helmet());
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 10, // Start blocking after 10 failed login attempts
    message: { error: 'Too many login attempts, please try again later' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/upload', uploadRoutes);
// ==========================================
// 2. DATABASE CONNECTIONS
// ==========================================
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log('🗄️  MongoDB Connected Successfully'))
    .catch((err) => console.error('🚨 MongoDB Connection Error:', err));

const redisConnection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
});

const pdfQueue = new Queue('pdf-parsing-queue', {
    connection: redisConnection
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Limit each file to 10MB
});

// ==========================================
// 3. API ROUTES
// ==========================================

// Auth Routes (Login / Register)
app.use('/api/auth', authRouter);

// Folders & Profile Routes
app.use('/api/folders', folderRoutes);
app.use('/api/users', userRoutes);

// Secure Statements Routes (Using router instead of duplicate inline code)
app.use('/api/statements', authenticate, statementRoutes);

// Main Asynchronous Ingestion Route: Receives multiple PDF statements from React
app.post('/api/upload/async', authenticate, upload.array('statements'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No files uploaded.' });
            return;
        }

        console.log(`Received ${files.length} statement files. Enqueueing background jobs...`);

        // Fetch user's custom key
        const user = await User.findById(req.userId);
        const customApiKey = user?.geminiApiKey;
        const folderId = req.body.folderId || undefined;

        for (const file of files) {
            await pdfQueue.add('parse-pdf-job', {
                fileName: file.originalname,
                fileBuffer: file.buffer.toString('base64'),
                mimeType: file.mimetype,
                userId: req.userId,
                folderId,
                customApiKey
            });
        }

        res.status(202).json({
            message: `Successfully enqueued ${files.length} files for processing.`,
            status: 'processing'
        });
    } catch (error) {
        console.error('Upload route error:', error);
        res.status(500).json({ error: 'Internal server initialization error.' });
    }
});

// ==========================================
// 4. START SERVER
// ==========================================
app.listen(port, () => {
    console.log(`🚀 Industrial Backend Engine live at http://localhost:${port}`);
});