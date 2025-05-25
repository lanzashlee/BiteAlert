const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Connect to MongoDB
mongoose.connect('mongodb+srv://lricamara6:Lanz0517@bitealert.febjlgm.mongodb.net/bitealert', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Define the schema
const animalBiteSchema = new Schema({
    patientName: String,
    age: Number,
    gender: String,
    barangay: String,
    incidentDate: Date,
    animalType: String,
    vaccinationStatus: String,
    woundLocation: String,
    severity: String,
    treatmentGiven: String,
    followUpDate: Date,
    status: String,
    createdAt: { type: Date, default: Date.now }
});

const AnimalBite = mongoose.model('AnimalBite', animalBiteSchema);

// Sample data
const sampleData = [
    {
        patientName: "Juan Dela Cruz",
        age: 25,
        gender: "Male",
        barangay: "San Antonio",
        incidentDate: new Date(2024, 2, 15),
        animalType: "Dog",
        vaccinationStatus: "Unvaccinated",
        woundLocation: "Right leg",
        severity: "Moderate",
        treatmentGiven: "Wound cleaning and anti-rabies vaccine",
        followUpDate: new Date(2024, 2, 22),
        status: "Active"
    },
    {
        patientName: "Maria Santos",
        age: 35,
        gender: "Female",
        barangay: "San Miguel",
        incidentDate: new Date(2024, 2, 16),
        animalType: "Cat",
        vaccinationStatus: "Unknown",
        woundLocation: "Left hand",
        severity: "Mild",
        treatmentGiven: "Wound cleaning",
        followUpDate: new Date(2024, 2, 23),
        status: "Completed"
    },
    {
        patientName: "Pedro Reyes",
        age: 45,
        gender: "Male",
        barangay: "San Antonio",
        incidentDate: new Date(2024, 2, 17),
        animalType: "Dog",
        vaccinationStatus: "Vaccinated",
        woundLocation: "Right arm",
        severity: "Severe",
        treatmentGiven: "Wound cleaning, anti-rabies vaccine, and antibiotics",
        followUpDate: new Date(2024, 2, 24),
        status: "Active"
    },
    {
        patientName: "Ana Lim",
        age: 15,
        gender: "Female",
        barangay: "San Jose",
        incidentDate: new Date(2024, 2, 18),
        animalType: "Dog",
        vaccinationStatus: "Unknown",
        woundLocation: "Left leg",
        severity: "Moderate",
        treatmentGiven: "Wound cleaning and anti-rabies vaccine",
        followUpDate: new Date(2024, 2, 25),
        status: "Active"
    },
    {
        patientName: "Roberto Garcia",
        age: 55,
        gender: "Male",
        barangay: "San Miguel",
        incidentDate: new Date(2024, 2, 19),
        animalType: "Cat",
        vaccinationStatus: "Unvaccinated",
        woundLocation: "Right hand",
        severity: "Mild",
        treatmentGiven: "Wound cleaning",
        followUpDate: new Date(2024, 2, 26),
        status: "Pending"
    }
];

// Function to add sample data
async function addSampleData() {
    try {
        // Clear existing data
        await AnimalBite.deleteMany({});
        console.log('Cleared existing data');

        // Insert new data
        const result = await AnimalBite.insertMany(sampleData);
        console.log(`Added ${result.length} sample animal bite cases`);

        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error adding sample data:', error);
        process.exit(1);
    }
}

// Run the function
addSampleData(); 