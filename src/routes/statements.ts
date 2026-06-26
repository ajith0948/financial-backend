import express from 'express';
import { getUserStatements,deleteStatement } from '../controllers/statementController';

const router = express.Router();

// When the frontend calls GET /api/statements, it runs your cache function!
router.get('/', getUserStatements);
router.delete('/:id', deleteStatement);
export default router;