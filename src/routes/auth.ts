import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as realJwt from 'jsonwebtoken';
import User from '../models/User'; 
import nodemailer from 'nodemailer';
import axios from 'axios';
import { z } from 'zod';
import { validate } from '../middleware/validate';

// 🌟 Initialize the Express Router
const router = express.Router();

// ==========================================
// 📧 NODEMAILER SETUP
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// 🔑 TOKEN GENERATORS
// ==========================================
const generateAccessToken = (userId: string) => {
    return realJwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '15m' }); // 15 mins
};

const generateRefreshToken = (userId: string) => {
    return realJwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' }); // 7 days
};

const setRefreshCookie = (res: Response, token: string) => {
    res.cookie('refreshToken', token, {
        httpOnly: true, // Javascript cannot read this (Immune to XSS)
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

// ==========================================
// 🚀 CONTROLLER LOGIC
// ==========================================
const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        // 🛡️ THE SHIELD: If they don't provide a password, kick them out immediately.
        if (!password) {
            return res.status(400).json({ error: 'Password is required to create an account.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use.' });
        }

        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash the password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the user in an "unverified" state
        await User.create({ 
            email, 
            password: hashedPassword, 
            resetCode: otpCode, // Reusing resetCode field for OTP temp storage
            resetCodeExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
        });

        // Send the OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'FinEngine - Verify Your Account',
            html: `<h2>Welcome! Your verification code is: <b>${otpCode}</b></h2><p>This code expires in 15 minutes.</p>`
        });

        res.json({ message: 'OTP sent to your email!' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
};

const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, otp } = req.body;
        
        // Find user and ensure code isn't expired
        const user = await User.findOne({ 
            email, 
            resetCode: otp,
            resetCodeExpiry: { $gt: new Date() } 
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        // Mark user as verified and clear the OTP
        user.resetCode = undefined;
        user.resetCodeExpiry = undefined;
        user.isVerified = true;
        await user.save();

        res.json({ message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
};
const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.password) return res.status(400).json({ error: 'Invalid credentials' });

        if (!user.isVerified) return res.status(403).json({ error: 'Please verify your email address before logging in.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const accessToken = generateAccessToken(user._id.toString());
        const refreshToken = generateRefreshToken(user._id.toString());

        setRefreshCookie(res, refreshToken);
        res.json({ token: accessToken, user: { id: user._id, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

const googleLogin = async (req: Request, res: Response): Promise<any> => {
    try {
        const { accessToken } = req.body;

        const googleRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const { email, sub: googleId } = googleRes.data;

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ email, googleId, isVerified: true });
        }

        const newAccessToken = generateAccessToken(user._id.toString());
        const newRefreshToken = generateRefreshToken(user._id.toString());

        setRefreshCookie(res, newRefreshToken);
        res.json({ token: newAccessToken, user: { id: user._id, email: user.email } });
    } catch (error) {
        // 👇 ADD THIS EXACT LINE 👇
        console.error("GOOGLE CRASH REASON:", error); 
        
        res.status(400).json({ error: 'Google authentication failed' });
    }
    
};

const refreshToken = async (req: Request, res: Response): Promise<any> => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ error: 'No refresh token' });

        const decoded = realJwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
        const user = await User.findById(decoded.id);
        
        if (!user) return res.status(401).json({ error: 'User not found' });

        const newAccessToken = generateAccessToken(user._id.toString());
        res.json({ token: newAccessToken });
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
};

const forgotPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'Email not found' });

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        user.resetCode = resetCode;
        user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'FinEngine - Password Reset Code',
            html: `<h2>Your Password Reset Code is: <b>${resetCode}</b></h2><p>This code expires in 15 minutes.</p>`
        });

        res.json({ message: 'Reset code sent to email' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
};

const resetPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, resetCode, newPassword } = req.body;
        const user = await User.findOne({ 
            email, 
            resetCode, 
            resetCodeExpiry: { $gt: new Date() } 
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired code' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetCode = undefined;
        user.resetCodeExpiry = undefined;
        await user.save();

        res.json({ message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

const logout = (req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
};
const authSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address format'),
        password: z.string().min(8, 'Password must be at least 8 characters')
    })
});

// ==========================================
// 🛣️ ROUTE DEFINITIONS
// ==========================================
router.post('/login', validate(authSchema), login);
router.post('/register', validate(authSchema), register);
router.post('/google', googleLogin);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.post('/verify-otp', verifyOtp);

// 📤 Export the router so server.ts can use it!
export default router;