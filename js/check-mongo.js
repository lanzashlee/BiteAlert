/**
 * MongoDB Connection Check Utility
 * This script checks if the MongoDB server is running by making a simple test request
 */

function checkMongoDBConnection() {
    return new Promise((resolve, reject) => {
        fetch('/api/mongo-status', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.connected) {
                console.log('✅ MongoDB is connected');
                resolve(true);
            } else {
                console.error('❌ MongoDB connection failed:', data.error);
                reject(data.error);
            }
        })
        .catch(error => {
            console.error('❌ Failed to check MongoDB status:', error);
            reject(error);
        });
    });
}

// Usage: Call this function from the console to check MongoDB connection
// You can also add this to a button or auto-run it when needed
// checkMongoDBConnection().then(connected => { /* do something */ }).catch(err => { /* handle error */ }); 