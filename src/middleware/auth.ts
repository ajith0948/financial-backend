import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Strips away the word "Bearer"
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        req.userId = decoded.id || decoded.userId || decoded._id;
        
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
        }
        
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};
