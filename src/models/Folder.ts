import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    color: string;
    createdAt: Date;
}

const FolderSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#94a3b8' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
