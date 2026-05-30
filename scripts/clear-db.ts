/**
 * Clear All Database Collections
 * 
 * Script để xóa tất cả dữ liệu seed cũ trong database
 */

import * as mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/furnimart?authSource=admin';

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const connection = await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Wait a bit for connection to be fully ready
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get all collection names
    const db = connection.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`\n🗑️  Found ${collectionNames.length} collections to delete:`);
    collectionNames.forEach(name => console.log(`   - ${name}`));

    // Delete all collections
    console.log('\n🗑️  Deleting all collections...');
    for (const collectionName of collectionNames) {
      try {
        await db.collection(collectionName).drop();
        console.log(`   ✅ Deleted: ${collectionName}`);
      } catch (error: any) {
        // Ignore errors for system collections or already dropped collections
        if (error.codeName !== 'NamespaceNotFound') {
          console.log(`   ⚠️  Could not delete ${collectionName}: ${error.message}`);
        }
      }
    }

    console.log('\n✅ All collections cleared successfully!');
    console.log('\n📊 Remaining collections:');
    const remainingCollections = await db.listCollections().toArray();
    if (remainingCollections.length === 0) {
      console.log('   (none)');
    } else {
      remainingCollections.forEach(c => console.log(`   - ${c.name}`));
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

clearDatabase();

