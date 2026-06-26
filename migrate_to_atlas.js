const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://localhost:27017/financial_analyzer';
const ATLAS_URI = 'mongodb+srv://admin:AKASH%4020062k@cluster0.7922wv8.mongodb.net/financial_analyzer?appName=Cluster0';

async function migrateData() {
    let localClient, atlasClient;
    try {
        console.log('🔗 Connecting to Local MongoDB...');
        localClient = await MongoClient.connect(LOCAL_URI);
        const localDb = localClient.db('financial_analyzer');

        console.log('☁️ Connecting to Atlas MongoDB...');
        atlasClient = await MongoClient.connect(ATLAS_URI);
        const atlasDb = atlasClient.db('financial_analyzer');

        const collections = ['users', 'folders', 'statements'];

        for (const colName of collections) {
            console.log(`\n📦 Migrating collection: ${colName}...`);
            const data = await localDb.collection(colName).find({}).toArray();
            
            if (data.length === 0) {
                console.log(`   └─ Local ${colName} is empty. Skipping.`);
                continue;
            }

            console.log(`   ├─ Found ${data.length} documents in local DB.`);
            
            // Clear existing data in Atlas for this collection to avoid duplicates
            await atlasDb.collection(colName).deleteMany({});
            console.log(`   ├─ Cleared existing data in Atlas for ${colName}.`);
            
            // Insert data into Atlas
            const result = await atlasDb.collection(colName).insertMany(data);
            console.log(`   └─ Successfully inserted ${result.insertedCount} documents into Atlas.`);
        }

        console.log('\n✅ Migration complete! Your data is now on MongoDB Atlas.');

    } catch (error) {
        console.error('🚨 Migration Error:', error);
    } finally {
        if (localClient) await localClient.close();
        if (atlasClient) await atlasClient.close();
    }
}

migrateData();
