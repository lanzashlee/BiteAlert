const mongoose = require('mongoose');

// Use the same connection string as your main server
const MONGODB_URI = 'mongodb+srv://lricamara6:Lanz0517@bitealert.febjlgm.mongodb.net/bitealert?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Use a loose schema to update any document
const inventoryItemSchema = new mongoose.Schema({}, { strict: false });
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema, 'inventoryitems');

async function updateCenterNames() {
  try {
    const result = await InventoryItem.updateMany(
      { $or: [{ centerName: { $exists: false } }, { centerName: '' }] },
      { $set: { centerName: 'Barangay Health Center 1' } }
    );
    console.log(`Updated ${result.nModified || result.modifiedCount} items.`);
  } catch (err) {
    console.error('Error updating items:', err);
  } finally {
    mongoose.disconnect();
  }
}

updateCenterNames(); 