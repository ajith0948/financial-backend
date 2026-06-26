import mongoose, { Schema, Document } from 'mongoose';

export interface IStatement extends Document {
    userId: mongoose.Types.ObjectId; 
    originalFileName: string;
    category: string; // 👈 Changed from strict options to a universal string
    extractedData: any; 
    totalAmount: number; // 👈 Confirmed matching field name
    folderId?: mongoose.Types.ObjectId; // 👈 Optional reference to a Folder
    processedAt: Date;
}

const StatementSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalFileName: { type: String, required: true },
    
    // 🛡️ UNIVERSAL FIX: Removed the enum bouncer completely. 
    // It now accepts any string the AI passes.
    category: { type: String, default: 'Other' },
    
    extractedData: { type: Schema.Types.Mixed }, 
    
    totalAmount: { type: Number, default: 0 },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder' }, // 👈 Link to Folder model
    processedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Statement || mongoose.model<IStatement>('Statement', StatementSchema);