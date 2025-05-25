const { MongoClient } = require('mongodb');

async function setupMongoDBUser() {
    const uri = 'mongodb+srv://lricamara6:Lanz0517@bitealert.febjlgm.mongodb.net/bitealert';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('biteAlert');

        // Create admin user
        await db.command({
            createUser: 'admin',
            pwd: 'your_secure_password',
            roles: [
                { role: 'readWrite', db: 'biteAlert' },
                { role: 'dbAdmin', db: 'biteAlert' }
            ]
        });

        console.log('MongoDB user created successfully');
    } catch (error) {
        console.error('Error setting up MongoDB user:', error);
    } finally {
        await client.close();
    }
}

setupMongoDBUser(); 