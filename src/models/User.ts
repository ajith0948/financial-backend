import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password?: string;      // 👈 Optional so Google Auth doesn't crash
    googleId?: string;      // 👈 Needed to link Google accounts
    isVerified: boolean;    // 👈 Checks if they passed OTP
    resetCode?: string;     // 👈 Stores BOTH the OTP and the Forgot Password code
    resetCodeExpiry?: Date; // 👈 When the code dies
    geminiApiKey?: string;  // 👈 User's custom Gemini API key
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, 
    googleId: { type: String },
    isVerified: { type: Boolean, default: false },
    resetCode: { type: String,index: true },
    resetCodeExpiry: { type: Date },
    geminiApiKey: { type: String }
}, { timestamps: true });

// 🛡️ THE FIX: Exporting as DEFAULT so auth.ts can read it perfectly
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);