
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@127.0.0.1:27017/furnimart?authSource=admin';

export async function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
}

export async function disconnectDB() {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
}
