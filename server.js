const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://lricamara6:Lanz0517@bitealert.febjlgm.mongodb.net/bitealert?retryWrites=true&w=majority";
const MONGODB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 60000,
    family: 4,
    maxPoolSize: 10
};

// Schema Definitions
const adminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    birthdate: { type: Date, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin'], required: true },
    adminID: { type: String, unique: true }, // e.g., AD001
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now },
    resetOTP: String,
    resetOTPExpires: Date
});

const superAdminSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    birthdate: { type: Date, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'superadmin' },
    superAdminID: { type: String, unique: true }, // e.g., SA001
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    resetOTP: String,
    resetOTPExpires: Date
});

const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    role: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    action: { type: String, required: true },
    adminID: String,
    superAdminID: String,
    patientID: String,
    staffID: String
});

const animalBiteSchema = new mongoose.Schema({
    patientName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    barangay: { type: String, required: true },
    incidentDate: { type: Date, required: true },
    animalType: { type: String, required: true },
    vaccinationStatus: { type: String, required: true },
    woundLocation: { type: String, required: true },
    severity: { type: String, required: true },
    treatmentGiven: { type: String, required: true },
    followUpDate: { type: Date },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// Staff Schema and Model
const staffSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    phone: String,
    birthdate: Date,
    password: String,
    role: String,
    createdAt: Date,
    isApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false }
});
const Staff = mongoose.model('Staff', staffSchema, 'staffs');

const Admin = mongoose.model('Admin', adminSchema);
const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);
const AuditTrail = mongoose.model('AuditTrail', auditLogSchema, 'audittrail');
const AnimalBite = mongoose.model('AnimalBite', animalBiteSchema);

// Inventory Item Schema and Model
const inventoryItemSchema = new mongoose.Schema({
    barangay: { type: String, required: true },
    type: { type: String, enum: ['Vaccine', 'Medicine', 'Other'], required: true },
    name: { type: String, required: true },
    batchNumber: { type: String },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    minThreshold: { type: Number, required: true, default: 0 },
    expiryDate: { type: Date },
    lastUpdated: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    notes: { type: String },
    status: { type: String, enum: ['active', 'expired', 'low', 'out'], default: 'active' }
});
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

// Stock History Schema and Model
const stockHistorySchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    change: { type: Number, required: true },
    oldValue: { type: Number, required: true },
    newValue: { type: Number, required: true },
    adminId: { type: String, required: true },
    adminName: { type: String },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String }
});
const StockHistory = mongoose.model('StockHistory', stockHistorySchema);

// Default SuperAdmin Accounts
const DEFAULT_SUPERADMINS = [
    {
        id: "681a4d793a6a72d951d31394",
        firstName: "Lanz Ashlee",
        middleName: "D.",
        lastName: "Ricamara",
        email: "admin@bitealert.com",
        phoneNumber: "09123456789",
        birthdate: new Date("1990-01-01"),
        password: "Admin123!",
        role: "superadmin",
        superAdminID: "SA001"
    },
    {
        id: "681a4d793a6a72d951d31395",
        firstName: "Bite",
        middleName: "",
        lastName: "Alert",
        email: "bitealert1@gmail.com",
        phoneNumber: "09123456788",
        birthdate: new Date("1991-01-01"),
        password: "Admin123!",
        role: "superadmin",
        superAdminID: "SA002"
    },
    {
        id: "681a4d793a6a72d951d31396",
        firstName: "Juan",
        middleName: "",
        lastName: "Dela Cruz",
        email: "admin3@bitealert.com",
        phoneNumber: "09123456787",
        birthdate: new Date("1992-01-01"),
        password: "Admin123!",
        role: "superadmin",
        superAdminID: "SA003"
    }
];

// Initialize SuperAdmin Accounts
async function createInitialSuperAdmins() {
    for (const superAdminData of DEFAULT_SUPERADMINS) {
        try {
            const existingUser = await SuperAdmin.findOne({ email: superAdminData.email });
            if (existingUser) {
                // Update existing superadmin's password
                const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
                existingUser.password = hashedPassword;
                existingUser.superAdminID = superAdminData.superAdminID;
                await existingUser.save();
                console.log(`Existing SuperAdmin account (${superAdminData.email}) password updated successfully`);
            } else {
                // Create new superadmin
                const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
                const superAdmin = new SuperAdmin({
                    firstName: superAdminData.firstName,
                    middleName: superAdminData.middleName,
                    lastName: superAdminData.lastName,
                    email: superAdminData.email,
                    phoneNumber: superAdminData.phoneNumber,
                    birthdate: superAdminData.birthdate,
                    password: hashedPassword,
                    role: superAdminData.role,
                    superAdminID: superAdminData.superAdminID
                });
                await superAdmin.save();
                console.log(`New SuperAdmin account (${superAdminData.email}) created successfully`);
            }
        } catch (error) {
            console.error(`Error managing SuperAdmin account (${superAdminData.email}):`, error);
        }
    }
}

// Patch all superadmins and admins to ensure they have superAdminID and adminID
async function patchAdminAndSuperAdminIDs() {
    // Patch SuperAdmins
    const superAdmins = await SuperAdmin.find({});
    let superAdminCounter = 1;
    for (const sa of superAdmins) {
        if (!sa.superAdminID) {
            sa.superAdminID = `SA${String(superAdminCounter).padStart(3, '0')}`;
            await sa.save();
        }
        superAdminCounter++;
    }
    // Patch Admins
    const admins = await Admin.find({});
    let adminCounter = 1;
    for (const admin of admins) {
        if (!admin.adminID) {
            admin.adminID = `AD${String(adminCounter).padStart(3, '0')}`;
            await admin.save();
        }
        adminCounter++;
    }
}

// Function to log audit trail
async function logAuditTrail(role, firstName, middleName, lastName, action, ids = {}) {
    try {
        const auditLog = new AuditTrail({
            timestamp: new Date(),
            role,
            firstName,
            middleName,
            lastName,
            action,
            adminID: ids.adminID || null,
            superAdminID: ids.superAdminID || null,
            patientID: ids.patientID || null,
            staffID: ids.staffID || null
        });
        await auditLog.save();
    } catch (error) {
        console.error('Error logging audit trail:', error);
    }
}

// Add WebSocket and HTTP server setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connections store
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
    });
});

// Broadcast updates to all connected clients
function broadcastUpdate(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/dashboard(.html)?', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/admin_dashboard(.html)?', (req, res) => res.sendFile(path.join(__dirname, 'admin-management.html')));
app.get('/create_account(.html)?', (req, res) => res.sendFile(path.join(__dirname, 'create_account.html')));
app.get('/admin_profile(.html)?', (req, res) => res.sendFile(path.join(__dirname, 'admin_profile.html')));

// API Routes
// Create Account
app.post('/api/create-account', async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, phoneNumber, birthdate, password, role } = req.body;

        console.log('Received create account request:', req.body); // Debug log

        // Validate required fields
        if (!firstName || !lastName || !email || !phoneNumber || !birthdate || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'All required fields must be filled out',
                errors: {
                    firstName: !firstName ? 'First name is required' : undefined,
                    lastName: !lastName ? 'Last name is required' : undefined,
                    email: !email ? 'Email is required' : undefined,
                    phoneNumber: !phoneNumber ? 'Phone number is required' : undefined,
                    birthdate: !birthdate ? 'Birthdate is required' : undefined,
                    password: !password ? 'Password is required' : undefined,
                    role: !role ? 'Role is required' : undefined
                }
            });
        }

        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address',
                errors: {
                    email: 'Please enter a valid email address'
                }
            });
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        const existingSuperAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
        
        if (existingAdmin || existingSuperAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'This email address is already registered',
                errors: {
                    email: 'This email address is already registered'
                }
            });
        }

        // Validate phone number format (Philippine format)
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)',
                errors: {
                    phoneNumber: 'Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)'
                }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let newAccount;
        if (role === 'superadmin') {
            const superAdminID = await getNextSuperAdminID();
            newAccount = new SuperAdmin({
                firstName,
                middleName,
                lastName,
                email: email.toLowerCase(),
                phoneNumber,
                birthdate,
                password: hashedPassword,
                role,
                superAdminID,
                isActive: true,
                createdAt: new Date()
            });
        } else {
            const adminID = await getNextAdminID();
            newAccount = new Admin({
                firstName,
                middleName,
                lastName,
                email: email.toLowerCase(),
                phoneNumber,
                birthdate,
                password: hashedPassword,
                role,
                adminID,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // Save the admin to the database
        await newAccount.save();
        console.log('New admin created successfully:', newAccount); // Debug log

        // Log the action
        await logAuditTrail(
            newAccount.role,
            newAccount.firstName,
            newAccount.middleName,
            newAccount.lastName,
            'CREATE_ACCOUNT',
            {
                adminID: newAccount.adminID,
                superAdminID: newAccount.superAdminID
            }
        );

        // Broadcast the update to all connected clients
        broadcastUpdate({
            type: 'newAccount',
            account: {
                id: newAccount._id,
                firstName: newAccount.firstName,
                middleName: newAccount.middleName,
                lastName: newAccount.lastName,
                email: newAccount.email,
                role: newAccount.role,
                adminID: newAccount.adminID,
                superAdminID: newAccount.superAdminID
            }
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Account created successfully',
            user: {
                id: newAccount._id,
                firstName: newAccount.firstName,
                middleName: newAccount.middleName,
                lastName: newAccount.lastName,
                email: newAccount.email,
                role: newAccount.role,
                adminID: newAccount.adminID,
                superAdminID: newAccount.superAdminID
            }
        });
    } catch (error) {
        console.error('Error creating account:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create account. Please try again.',
            error: error.message
        });
    }
});

// Unified Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for email: ${email}`);

        // Check SuperAdmin collection first
        let user = await SuperAdmin.findOne({ email });
        let userType = 'superadmin';

        // If not found, check Admin collection
        if (!user) {
            user = await Admin.findOne({ email });
            userType = user ? user.role : null;
        }

        if (!user) {
            console.log(`Login failed: User not found for email ${email}`);
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Validate password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log(`Login failed: Invalid password for email ${email}`);
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if admin account is active (only for regular admins)
        if (userType === 'admin' && user.isActive === false) {
            console.log(`Login failed: Account is deactivated for ${email}`);
            return res.json({
                success: false,
                message: 'Your account has been deactivated. Please contact a super admin.'
            });
        }

        // Log the action with the correct ID
        const ids = {};
        if (userType === 'admin') {
            ids.adminID = user.adminID;
        } else if (userType === 'superadmin') {
            ids.superAdminID = user.superAdminID;
        }

        await logAuditTrail(
            userType,
            user.firstName,
            user.middleName,
            user.lastName,
            'Signed in',
            ids
        );
        
        console.log(`Login successful for ${email} (${userType})`);

        // Send response
        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                role: userType,
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.json({
            success: false,
            message: 'An error occurred during login. Please try again.'
        });
    }
});

// Get Audit Trail API Endpoint
app.get('/api/audit-trail', async (req, res) => {
    try {
        const { dateFrom, dateTo, role } = req.query;
        let query = {};
        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
            if (dateTo) query.timestamp.$lte = new Date(dateTo);
        }
        if (role) query.role = new RegExp(role, 'i');
        const auditLogs = await AuditTrail.find(query)
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(auditLogs);
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ message: 'Error fetching audit trail' });
    }
});

// Modify your existing logout endpoint or add one if it doesn't exist
app.post('/api/logout', async (req, res) => {
    try {
        const { role, firstName, middleName, lastName, adminID, superAdminID, action } = req.body;
        
        // Create the appropriate ID object based on role
        const ids = {};
        if (role === 'admin' && adminID) {
            ids.adminID = adminID;
        } else if (role === 'superadmin' && superAdminID) {
            ids.superAdminID = superAdminID;
        }

        // Log the audit trail with the correct ID
        await logAuditTrail(
            role,
            firstName,
            middleName,
            lastName,
            action || 'Signed out',
            ids
        );

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ message: 'Error during logout' });
    }
});

// Optimize the Get All Admin Accounts endpoint
app.get('/api/admin-accounts', async (req, res) => {
    try {
        const [adminUsers, superAdmins] = await Promise.all([
            Admin.find({ role: 'admin' })
                .select('_id firstName middleName lastName email createdAt isActive adminID')
                .lean(),
            SuperAdmin.find()
                .select('_id firstName middleName lastName email createdAt superAdminID')
                .lean()
        ]);
        
        const allAccounts = [
            ...superAdmins.map(admin => ({
                id: admin._id,
                username: admin.email,
                firstName: admin.firstName,
                middleName: admin.middleName,
                lastName: admin.lastName,
                role: 'superadmin',
                createdAt: admin.createdAt,
                isActive: true,
                superAdminID: admin.superAdminID
            })),
            ...adminUsers.map(admin => ({
                id: admin._id,
                username: admin.email,
                firstName: admin.firstName,
                middleName: admin.middleName,
                lastName: admin.lastName,
                role: 'admin',
                createdAt: admin.createdAt,
                isActive: admin.isActive,
                adminID: admin.adminID
            }))
        ];

        // Cache the results in Redis or memory cache if available
        res.json(allAccounts);
    } catch (error) {
        console.error('Error fetching admin accounts:', error);
        res.status(500).json({ message: 'Error fetching admin accounts' });
    }
});

// Optimize the Update Account Status endpoint
app.post('/api/update-account-status', async (req, res) => {
    try {
        const { accountId, isActive } = req.body;
        const isActiveBoolean = Boolean(isActive);
        
        const user = await Admin.findByIdAndUpdate(
            accountId,
            { 
                $set: { isActive: isActiveBoolean },
                $currentDate: { updatedAt: true }
            },
            { 
                new: true,
                select: '_id firstName middleName lastName email role isActive'
            }
        );

        if (!user) {
            const superAdmin = await SuperAdmin.findById(accountId);
            if (superAdmin) {
                return res.status(400).json({ 
                    success: false,
                    message: 'SuperAdmin accounts cannot be deactivated' 
                });
            }
            return res.status(404).json({ 
                success: false,
                message: 'Account not found' 
            });
        }

        // Log the action in the background
        logAuditTrail(
            user.role,
            user.firstName,
            user.middleName,
            user.lastName,
            `Account ${isActiveBoolean ? 'activated' : 'deactivated'}`,
            {
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        ).catch(error => console.error('Error logging audit trail:', error));

        // Broadcast the update to all connected clients
        broadcastUpdate({
            type: 'accountUpdate',
            account: {
                id: user._id,
                username: user.email,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                role: user.role,
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        });
        
        res.json({ 
            success: true,
            message: 'Account status updated successfully',
            account: {
                id: user._id,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        });
    } catch (error) {
        console.error('Error updating account status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error updating account status', 
            error: error.message 
        });
    }
});

// Get Account Status API Endpoint - to check current account status
app.get('/api/account-status/:email', async (req, res) => {
    try {
        const { email } = req.params;
        console.log(`Checking account status for email: ${email}`);
        
        // First check in Admin collection
        let user = await Admin.findOne({ email });
        let account = null;
        
        if (user) {
            account = {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                role: user.role,
                adminID: user.adminID,
                superAdminID: user.superAdminID
            };
        } else {
            // If not found, check SuperAdmin collection
            const superAdmin = await SuperAdmin.findOne({ email });
            if (superAdmin) {
                account = {
                    id: superAdmin._id,
                    email: superAdmin.email,
                    firstName: superAdmin.firstName,
                    middleName: superAdmin.middleName,
                    lastName: superAdmin.lastName,
                    role: 'superadmin',
                    superAdminID: superAdmin.superAdminID, // <-- FIXED
                    isActive: true, // SuperAdmins are always active
                };
            }
        }
        
        if (account) {
            res.json({ success: true, account });
        } else {
            res.status(404).json({ success: false, message: 'Account not found' });
        }
    } catch (error) {
        console.error('Error checking account status:', error);
        res.status(500).json({ success: false, message: 'Error checking account status', error: error.message });
    }
});

// MongoDB Status Check Endpoint
app.get('/api/mongo-status', async (req, res) => {
    try {
        // Check if MongoDB is connected
        const state = mongoose.connection.readyState;
        /*
         * 0 = disconnected
         * 1 = connected
         * 2 = connecting
         * 3 = disconnecting
         */
        
        if (state === 1) {
            res.json({ connected: true, state: 'connected' });
        } else if (state === 2) {
            res.json({ connected: false, state: 'connecting', error: 'Database is still connecting' });
        } else if (state === 3) {
            res.json({ connected: false, state: 'disconnecting', error: 'Database is disconnecting' });
        } else {
            res.json({ connected: false, state: 'disconnected', error: 'Database is not connected' });
        }
    } catch (error) {
        console.error('Error checking MongoDB status:', error);
        res.json({ connected: false, error: error.message });
    }
});

// Analytics API Endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const days = parseInt(req.query.days || 30);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch cases from bitecases collection
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const cases = await BiteCase.find({
            createdAt: { $gte: startDate }
        }).lean();

        // Initialize analysis
        const analysis = {
            totalCases: cases.length,
            casesByBarangay: {},
            casesByStatus: {
                pending: 0,
                'in-progress': 0,
                resolved: 0
            },
            casesBySeverity: {
                low: 0,
                medium: 0,
                high: 0
            }
        };

        // Process cases
        cases.forEach(case_ => {
            // Count by barangay
            const barangay = case_.barangay || case_.address || 'Unknown';
            analysis.casesByBarangay[barangay] = (analysis.casesByBarangay[barangay] || 0) + 1;
            
            // Count by status
            const status = case_.status || 'pending';
            if (status in analysis.casesByStatus) {
                analysis.casesByStatus[status]++;
            }
            
            // Count by severity
            const severity = case_.exposureCategory === 'I' ? 'low' : 
                           case_.exposureCategory === 'II' ? 'medium' : 
                           case_.exposureCategory === 'III' ? 'high' : 'low';
            if (severity in analysis.casesBySeverity) {
                analysis.casesBySeverity[severity]++;
            }
        });

        res.json(analysis);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Report API Endpoints
app.get('/api/reports/cases', async (req, res) => {
    try {
        const { startDate, endDate, status } = req.query;
        let query = {
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (status && status !== 'all') {
            query.status = status;
        }

        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const cases = await BiteCase.find(query).sort({ createdAt: -1 });

        const response = {
            totalCases: cases.length,
            pendingCases: cases.filter(c => c.status === 'pending').length,
            resolvedCases: cases.filter(c => c.status === 'resolved').length,
            cases: cases.map(c => ({
                patientName: c.patientName || `${c.lastName || ''}, ${c.firstName || ''}${c.middleName ? ' ' + c.middleName : ''}`.trim(),
                age: c.age || '',
                barangay: c.barangay || c.address || 'Unknown',
                status: c.status || 'pending',
                severity: c.exposureCategory === 'I' ? 'Mild' : 
                         c.exposureCategory === 'II' ? 'Moderate' : 
                         c.exposureCategory === 'III' ? 'Severe' : 'Unknown',
                incidentDate: c.exposureDate || c.createdAt
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error generating cases report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
});

app.get('/api/reports/staff', async (req, res) => {
    try {
        const { startDate, endDate, role } = req.query;
        
        // Get staff members
        let staffQuery = {};
        if (role && role !== 'all') {
            staffQuery.role = role;
        }

        const admins = await Admin.find(staffQuery);
        const superAdmins = role === 'admin' ? [] : await SuperAdmin.find();
        const allStaff = [...admins, ...superAdmins];

        // Get activities
        let activityQuery = {
            timestamp: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (role && role !== 'all') {
            activityQuery.role = role;
        }

        const activities = await AuditTrail.find(activityQuery).sort({ timestamp: -1 });

        const response = {
            totalStaff: allStaff.length,
            activeStaff: admins.filter(a => a.isActive).length + superAdmins.length,
            activities: activities.map(a => ({
                firstName: a.firstName,
                middleName: a.middleName,
                lastName: a.lastName,
                role: a.role,
                action: a.action,
                timestamp: a.timestamp
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('Error generating staff report:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
});

// Profile API Endpoints
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let user = await Admin.findById(userId);
        
        if (!user) {
            user = await SuperAdmin.findById(userId);
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            birthdate: user.birthdate,
            role: user.role,
            adminID: user.adminID,
            superAdminID: user.superAdminID
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

app.put('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { firstName, middleName, lastName, email, phoneNumber, birthdate } = req.body;

        // Check if email is already in use by another user
        const existingUser = await Admin.findOne({ email, _id: { $ne: userId } });
        const existingSuperAdmin = await SuperAdmin.findOne({ email, _id: { $ne: userId } });

        if (existingUser || existingSuperAdmin) {
            return res.status(400).json({ message: 'Email is already in use' });
        }

        let user = await Admin.findById(userId);
        let isSuperAdmin = false;

        if (!user) {
            user = await SuperAdmin.findById(userId);
            isSuperAdmin = true;
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        user.firstName = firstName;
        user.middleName = middleName;
        user.lastName = lastName;
        user.email = email;
        user.phoneNumber = phoneNumber;
        user.birthdate = birthdate;

        await user.save();

        // Log the update
        const auditUserId3 = getAuditUserId(user);
        await logAuditTrail(
            isSuperAdmin ? 'superadmin' : 'admin',
            firstName,
            middleName,
            lastName,
            'Updated profile information',
            {
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        );

        res.json({
            message: 'Profile updated successfully',
            user: {
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

app.put('/api/profile/:userId/password', async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentPassword, newPassword } = req.body;

        let user = await Admin.findById(userId);
        let isSuperAdmin = false;

        if (!user) {
            user = await SuperAdmin.findById(userId);
            isSuperAdmin = true;
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Log the password change
        const auditUserId4 = getAuditUserId(user);
        await logAuditTrail(
            isSuperAdmin ? 'superadmin' : 'admin',
            user.firstName,
            user.middleName,
            user.lastName,
            'Changed password',
            {
                adminID: user.adminID,
                superAdminID: user.superAdminID
            }
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
});

// Enhanced email validation endpoint
app.post('/api/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }

        // Enhanced email format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email format' 
            });
        }

        // Check if email exists in both collections
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        const existingSuperAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
        
        res.json({ 
            success: true, 
            available: !existingAdmin && !existingSuperAdmin,
            message: existingAdmin || existingSuperAdmin ? 'Email is already registered' : 'Email is available'
        });
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking email availability' 
        });
    }
});

// Enhanced name validation endpoint
app.post('/api/check-name', async (req, res) => {
    try {
        const { firstName, middleName, lastName } = req.body;
        
        if (!firstName || !lastName) {
            return res.status(400).json({ 
                success: false, 
                message: 'First name and last name are required' 
            });
        }

        // Name format validation
        const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
        if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Names must contain only letters, spaces, hyphens, and apostrophes (2-50 characters)' 
            });
        }

        // Check name combination in both collections
        const existingAdmin = await Admin.findOne({ 
            firstName: firstName.toLowerCase(),
            lastName: lastName.toLowerCase()
        });
        const existingSuperAdmin = await SuperAdmin.findOne({ 
            firstName: firstName.toLowerCase(),
            lastName: lastName.toLowerCase()
        });
        
        res.json({ 
            success: true, 
            available: !existingAdmin && !existingSuperAdmin,
            message: existingAdmin || existingSuperAdmin ? 'Name combination is already registered' : 'Name is available'
        });
    } catch (error) {
        console.error('Error checking name:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking name availability' 
        });
    }
});

// Enhanced phone validation endpoint
app.post('/api/check-phone', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number is required' 
            });
        }

        // Enhanced phone number format validation (Philippine format)
        const phoneRegex = /^(09|\+639)\d{9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)' 
            });
        }

        // Check phone number in both collections
        const existingAdmin = await Admin.findOne({ phoneNumber });
        const existingSuperAdmin = await SuperAdmin.findOne({ phoneNumber });
        
        res.json({ 
            success: true, 
            available: !existingAdmin && !existingSuperAdmin,
            message: existingAdmin || existingSuperAdmin ? 'Phone number is already registered' : 'Phone number is available'
        });
    } catch (error) {
        console.error('Error checking phone number:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error checking phone number availability' 
        });
    }
});

// Get Geographical Distribution Data
app.get('/api/get-geographical-data', async (req, res) => {
    try {
        const sanJuanBarangays = [
            'Addition Hills',
            'Balong-Bato',
            'Batisan',
            'Corazon de Jesus',
            'Ermitaño',
            'Greenhills',
            'Halo-Halo',
            'Isabelita',
            'Kabayanan',
            'Little Baguio',
            'Maytunas',
            'Onse',
            'Pasadeña',
            'Pedro Cruz',
            'Progreso',
            'Rivera',
            'Salapan',
            'San Perfecto',
            'Santa Lucia',
            'Tibagan',
            'West Crame'
        ];

        // Get all cases from MongoDB
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const cases = await BiteCase.find({});
        
        // Initialize counts for each barangay
        const barangayCounts = {};
        sanJuanBarangays.forEach(barangay => {
            barangayCounts[barangay] = 0;
        });

        // Count cases for each barangay
        cases.forEach(case_ => {
            // Check both barangay and address fields for matches
            const address = case_.address || '';
            const barangay = case_.barangay || '';
            
            // Find matching barangay from the list
            const matchingBarangay = sanJuanBarangays.find(b => 
                address.toLowerCase().includes(b.toLowerCase()) || 
                barangay.toLowerCase().includes(b.toLowerCase())
            );

            if (matchingBarangay) {
                barangayCounts[matchingBarangay]++;
            }
        });

        // Format response
        const response = {
            locations: sanJuanBarangays,
            cases: sanJuanBarangays.map(barangay => barangayCounts[barangay])
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching geographical data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch geographical data'
        });
    }
});

// Add this before the server startup code
app.get('/api/status', (req, res) => {
    res.json({
        server: 'running',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date()
    });
});

// Test MongoDB connection endpoint
app.get('/api/test-mongo', async (req, res) => {
    try {
        // Try to fetch a single document from each collection
        const [patient, biteCase, inventory, center] = await Promise.all([
            mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients').findOne(),
            mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases').findOne(),
            mongoose.connection.model('InventoryItem', new mongoose.Schema({}, { strict: false }), 'inventoryitems').findOne(),
            mongoose.connection.model('Center', new mongoose.Schema({}, { strict: false }), 'centers').findOne()
        ]);

        res.json({
            success: true,
            message: 'MongoDB connection test successful',
            collections: {
                patients: patient ? 'has data' : 'empty',
                bitecases: biteCase ? 'has data' : 'empty',
                inventory: inventory ? 'has data' : 'empty',
                centers: center ? 'has data' : 'empty'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'MongoDB connection test failed',
            error: error.message
        });
    }
});

// Fetch demo prescriptive analytics data
app.get('/api/prescriptive-demo', async (req, res) => {
    try {
        const data = await mongoose.connection.collection('prescriptive_analytics_demos').find({}).toArray();

        // Unique prescriptive analytics algorithm
        const weights = {
            caseDensity: 0.3,
            vaccinationCoverage: 0.25,
            strayPopulation: 0.15,
            responseTime: 0.15,
            historicalTrend: 0.15
        };
        const MIN_VACCINE_ALLOCATION = 50; // Minimum vaccines per barangay

        const areas = data.map(area => {
            // Force all fields to numbers and default to 0
            const caseDensity = Number(area.caseDensity) || 0;
            const vaccinationCoverage = Number(area.vaccinationCoverage) || 0;
            const strayPopulation = Number(area.strayPopulation) || 0;
            const responseTime = Number(area.responseTime) || 0;
            const historicalTrend = Number(area.historicalTrend) || 0;

            const riskScore = Math.min(Math.round(
                (caseDensity * weights.caseDensity) +
                ((100 - vaccinationCoverage) * weights.vaccinationCoverage) +
                (strayPopulation * weights.strayPopulation) +
                (responseTime * weights.responseTime) +
                (historicalTrend * weights.historicalTrend)
            ), 100);

            // Debug log
            console.log({
              barangay: area.barangay,
              caseDensity,
              vaccinationCoverage,
              strayPopulation,
              responseTime,
              historicalTrend,
              riskScore
            });

            // Prescriptive recommendations
            let recommendations = [];
            if (riskScore >= 70) {
                recommendations = [
                    'Immediate vaccination drive',
                    'Intensive stray animal control',
                    'Rapid response teams',
                    'Public awareness campaign'
                ];
            } else if (riskScore >= 40) {
                recommendations = [
                    'Schedule vaccination drive',
                    'Regular stray animal monitoring',
                    'Community education'
                ];
            } else {
                recommendations = [
                    'Maintain current programs',
                    'Monitor trends'
                ];
            }

            // Prescriptive vaccine allocation
            // Base: 5% of population
            // + 0.1% of population per riskScore point
            // + 10% more if vaccinationCoverage < 30%
            let base = area.population * 0.05;
            let riskBoost = area.population * (riskScore / 1000); // 0.1% per risk point
            let lowCoverageBoost = area.vaccinationCoverage < 30 ? base * 0.1 : 0;
            let allocation = Math.round(base + riskBoost + lowCoverageBoost);
            allocation = Math.max(allocation, MIN_VACCINE_ALLOCATION);

            return {
                ...area,
                name: area.barangay,
                caseTrend: area.historicalTrend,
                riskScore,
                recommendations,
                resources: {
                    vaccines: allocation,
                    personnel: Math.ceil(area.population / 1000 * (riskScore / 100 + 1)),
                    awarenessMaterials: Math.ceil(area.population / 500 * (riskScore / 100 + 1))
                }
            };
        });

        res.json({ success: true, areas });
    } catch (error) {
        console.error('Error fetching demo data:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper: Weighted Moving Average
function weightedMovingAverage(data, weights) {
    let sum = 0, weightSum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * (weights[i] || 1);
        weightSum += (weights[i] || 1);
    }
    return weightSum ? sum / weightSum : 0;
}

// Helper: Dummy Distance (replace with real logic if needed)
function getDistance(center, barangay) {
    return Math.random() * 10 + 1;
}

// API: Generate and Store Vaccine Allocation Recommendations
app.post('/api/generate-vaccine-allocation', async (req, res) => {
    try {
        const { startDate, endDate, granularity = 'monthly', minVaccineLevel = 50, bufferPercent = 15 } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const groupFormat = granularity === 'daily' ? "%Y-%m-%d" : granularity === 'yearly' ? "%Y" : "%Y-%m";
        const cases = await AnimalBite.aggregate([
            { $match: { incidentDate: { $gte: start, $lte: end } } },
            { $group: {
                _id: { barangay: "$barangay", period: { $dateToString: { format: groupFormat, date: "$incidentDate" } } },
                count: { $sum: 1 }
            }}
        ]);
        const barangayData = {};
        cases.forEach(c => {
            if (!barangayData[c._id.barangay]) barangayData[c._id.barangay] = [];
            barangayData[c._id.barangay].push({ period: c._id.period, count: c.count });
        });
        const recommendations = [];
        for (const [barangay, periods] of Object.entries(barangayData)) {
            periods.sort((a, b) => a.period.localeCompare(b.period));
            const counts = periods.map(p => p.count);
            const weights = counts.map((_, i, arr) => i >= arr.length - 3 ? 2 : 1);
            const forecast = Math.ceil(weightedMovingAverage(counts, weights));
            let seasonalFactor = 1;
            const travelDistance = getDistance("MainCenter", barangay);
            let recommended = Math.max(
                Math.ceil(forecast * seasonalFactor * (1 + bufferPercent / 100)),
                minVaccineLevel
            );
            let priorityScore = forecast * 2 + travelDistance;
            let confidence = Math.min(1, counts.length / 6 + 0.5);
            let alertFlags = [];
            if (forecast > Math.max(...counts, 0) * 1.5) alertFlags.push("Unusual spike");
            if (counts.length < 3) alertFlags.push("Data gap");
            recommendations.push({
                barangay,
                recommendedQuantity: recommended,
                priorityRank: 0,
                expectedCoveragePeriod: `${granularity === 'monthly' ? 30 : 7} days`,
                confidenceScore: Math.round(confidence * 100) / 100,
                alertFlags
            });
        }
        recommendations.sort((a, b) => b.recommendedQuantity - a.recommendedQuantity);
        recommendations.forEach((rec, i) => rec.priorityRank = i + 1);
        const allocationDoc = new VaccineAllocation({
            generatedAt: new Date(),
            params: { startDate, endDate, granularity, minVaccineLevel, bufferPercent },
            recommendations
        });
        await allocationDoc.save();
        res.json({ success: true, allocation: allocationDoc });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// API: Get the latest vaccine allocation
app.get('/api/vaccine-allocation/latest', async (req, res) => {
    try {
        const latest = await VaccineAllocation.findOne().sort({ generatedAt: -1 });
        if (!latest) {
            return res.json({ success: false, message: "No allocation found." });
        }
        res.json({ success: true, allocation: latest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// TEMP: Insert sample AnimalBite data for testing
app.post('/api/insert-sample-animalbites', async (req, res) => {
    try {
        const now = new Date();
        const barangays = [
            'Greenhills', 'Salapan', 'Kabayanan', 'Maytunas', 'West Crame',
            'Addition Hills', 'Balong-Bato', 'Batisan', 'Corazon de Jesus', 'Ermitaño',
            'Isabelita', 'Little Baguio', 'Onse', 'Pasadeña', 'Pedro Cruz',
            'Progreso', 'Rivera', 'San Perfecto', 'Santa Lucia', 'Tibagan'
        ];
        const animalTypes = ['Dog', 'Cat', 'Monkey', 'Bat'];
        const woundLocations = ['Arm', 'Leg', 'Face', 'Hand', 'Foot'];
        const samples = [];
        for (let i = 0; i < 60; i++) {
            samples.push({
                patientName: `Test Patient ${i+1}`,
                age: 5 + (i % 60),
                gender: i % 2 === 0 ? 'Male' : 'Female',
                barangay: barangays[i % barangays.length],
                incidentDate: new Date(now.getTime() - (i * 86400000)), // spread over 60 days
                animalType: animalTypes[i % animalTypes.length],
                vaccinationStatus: i % 4 === 0 ? 'Vaccinated' : 'Unvaccinated',
                woundLocation: woundLocations[i % woundLocations.length],
                severity: ['low', 'medium', 'high'][i % 3],
                treatmentGiven: 'Wound cleaning',
                followUpDate: new Date(now.getTime() + ((i % 10) * 86400000)),
                status: ['pending', 'resolved', 'in-progress'][i % 3],
                createdAt: new Date(now.getTime() - (i * 86400000))
            });
        }
        await AnimalBite.insertMany(samples);
        res.json({ success: true, message: 'Expanded sample AnimalBite data inserted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API endpoint to fetch all staff
app.get('/api/staffs', async (req, res) => {
    try {
        const staffs = await Staff.find();
        res.json({ success: true, staffs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Approve staff
app.post('/api/staffs/:id/approve', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(
            req.params.id,
            { isApproved: true, isVerified: true },
            { new: true }
        );
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        // Log staff approval
        let firstName = staff.fullName;
        let lastName = '';
        if (staff.fullName && staff.fullName.includes(' ')) {
            const parts = staff.fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        const auditUserId5 = getAuditUserId(staff);
        await logAuditTrail(
            staff.role,
            firstName,
            '',
            lastName,
            'Staff approved',
            { staffID: staff.staffID }
        );
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reject (delete) staff
app.delete('/api/staffs/:id', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        // Log staff rejection/deletion
        let firstName = staff.fullName;
        let lastName = '';
        if (staff.fullName && staff.fullName.includes(' ')) {
            const parts = staff.fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        const auditUserId6 = getAuditUserId(staff);
        await logAuditTrail(
            staff.role,
            firstName,
            '',
            lastName,
            'Staff rejected/deleted',
            { staffID: staff.staffID }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Deactivate staff
app.post('/api/staffs/:id/deactivate', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        // Log staff deactivation
        let firstName = staff.fullName;
        let lastName = '';
        if (staff.fullName && staff.fullName.includes(' ')) {
            const parts = staff.fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        const auditUserId7 = getAuditUserId(staff);
        await logAuditTrail(
            staff.role,
            firstName,
            '',
            lastName,
            'Staff deactivated',
            { staffID: staff.staffID }
        );
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Activate staff
app.post('/api/staffs/:id/activate', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        // Log staff activation
        let firstName = staff.fullName;
        let lastName = '';
        if (staff.fullName && staff.fullName.includes(' ')) {
            const parts = staff.fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        const auditUserId8 = getAuditUserId(staff);
        await logAuditTrail(
            auditUserId8,
            staff.role,
            firstName,
            '',
            lastName,
            'Staff activated',
            { staffID: staff.staffID }
        );
        res.json({ success: true, staff });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================== INVENTORY API ENDPOINTS ==================

// Get all inventory items
app.get('/api/inventoryitems', async (req, res) => {
    try {
        const items = await InventoryItem.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch inventory items' });
    }
});

// Get a single inventory item
app.get('/api/inventoryitems/:id', async (req, res) => {
    try {
        const item = await InventoryItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch inventory item' });
    }
});

// Create a new inventory item
app.post('/api/inventoryitems', async (req, res) => {
    try {
        const item = new InventoryItem(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: 'Failed to create inventory item', error });
    }
});

// Update an inventory item
app.put('/api/inventoryitems/:id', async (req, res) => {
    try {
        const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Failed to update inventory item', error });
    }
});

// Delete an inventory item
app.delete('/api/inventoryitems/:id', async (req, res) => {
    try {
        const item = await InventoryItem.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(400).json({ message: 'Failed to delete inventory item', error });
    }
});

// Adjust stock (add/remove) and log history
app.post('/api/inventoryitems/:id/adjust', async (req, res) => {
    try {
        const { change, adminId, adminName, reason } = req.body;
        const item = await InventoryItem.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        const oldValue = item.quantity;
        const newValue = oldValue + change;
        item.quantity = newValue;
        item.lastUpdated = new Date();
        // Update status
        if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
            item.status = 'expired';
        } else if (newValue <= 0) {
            item.status = 'out';
        } else if (newValue <= item.minThreshold) {
            item.status = 'low';
        } else {
            item.status = 'active';
        }
        await item.save();
        // Log stock history
        const history = new StockHistory({
            itemId: item._id,
            change,
            oldValue,
            newValue,
            adminId,
            adminName,
            reason
        });
        await history.save();
        res.json({ item, history });
    } catch (error) {
        res.status(400).json({ message: 'Failed to adjust stock', error });
    }
});

// Get stock history for an item
app.get('/api/inventoryitems/:id/history', async (req, res) => {
    try {
        const history = await StockHistory.find({ itemId: req.params.id }).sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stock history' });
    }
});

// Configure your email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    let user = await Admin.findOne({ email }) || await SuperAdmin.findOne({ email });
    if (!user) return res.json({ success: false, message: 'Email not found.' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    await user.save();

    // Send OTP email
    await transporter.sendMail({
      from: `Bite Alert <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Bite Alert Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #800000;">Bite Alert Password Reset</h2>
          <p>Your OTP for password reset is:</p>
          <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.json({ success: false, message: 'Failed to send OTP.' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    let user = await Admin.findOne({ email }) || await SuperAdmin.findOne({ email });
    if (!user) return res.json({ success: false, message: 'Email not found.' });

    if (!user.resetOTP || !user.resetOTPExpires || user.resetOTPExpires < new Date()) {
      return res.json({ success: false, message: 'OTP expired or not found.' });
    }
    if (user.resetOTP !== otp) {
      return res.json({ success: false, message: 'Invalid OTP.' });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Failed to reset password.' });
  }
});

// Center Schema for vaccine tracking
const centerSchema = new mongoose.Schema({
  centerName: { type: String, required: true },
  address: { type: String, required: true },
  contactPerson: { type: String, required: true },
  contactNumber: { type: String, required: true },
  isArchived: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  serviceHours: [
    {
      day: { type: String, required: true }, // e.g., 'Monday'
      open: { type: String, required: true }, // e.g., '08:00'
      close: { type: String, required: true } // e.g., '17:00'
    }
  ]
});
const Center = mongoose.model('Center', centerSchema);

// --- MIGRATION SCRIPT: Run ONCE, then comment out ---
async function migrateVaccineData() {
  const centers = await Center.find({});
  for (const center of centers) {
    if (!center.vaccines || center.vaccines.length === 0) {
      // Assume old field is center.vaccinesDistributed
      center.vaccines = [
        { type: 'Anti-Rabies', count: center.vaccinesDistributed || 0 }
        // Add more types if you have them in your old data
      ];
      await center.save();
      console.log(`Migrated center: ${center.centerName}`);
    }
  }
}
// migrateVaccineData(); // Uncomment and run once, then comment out

// API: Get all centers
app.get('/api/centers', async (req, res) => {
  try {
    console.log('Fetching all centers...');
    const centers = await Center.find({}).sort({ lastUpdated: -1 });
    console.log(`Found ${centers.length} centers`);
    res.json({ success: true, data: centers });
  } catch (err) {
    console.error('Error fetching centers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch centers', error: err.message });
  }
});

// Add a new center
app.post('/api/centers', async (req, res) => {
  try {
    console.log('Adding new center:', req.body);
    const { centerName, address, contactPerson, contactNumber } = req.body;
    
    // Validate required fields
    if (!centerName || !address || !contactPerson || !contactNumber) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Create new center
    const center = new Center({
      centerName,
      address,
      contactPerson,
      contactNumber,
      lastUpdated: new Date()
    });

    // Save to database
    const savedCenter = await center.save();
    console.log('Center saved successfully:', savedCenter);
    
    res.status(201).json({ success: true, data: savedCenter });
  } catch (err) {
    console.error('Error adding center:', err);
    res.status(500).json({ success: false, message: 'Failed to add center', error: err.message });
  }
});

// Update a center
app.put('/api/centers/:id', async (req, res) => {
  try {
    console.log('Updating center:', req.params.id, req.body);
    const { centerName, address, contactPerson, contactNumber } = req.body;
    
    // Validate required fields
    if (!centerName || !address || !contactPerson || !contactNumber) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const center = await Center.findByIdAndUpdate(
      req.params.id,
      { 
        centerName, 
        address, 
        contactPerson, 
        contactNumber,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!center) {
      console.log('Center not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Center not found.' });
    }

    console.log('Center updated successfully:', center);
    res.json({ success: true, data: center });
  } catch (err) {
    console.error('Error updating center:', err);
    res.status(500).json({ success: false, message: 'Failed to update center', error: err.message });
  }
});

// Delete a center
app.delete('/api/centers/:id', async (req, res) => {
  try {
    console.log('Deleting center:', req.params.id);
    const center = await Center.findByIdAndDelete(req.params.id);
    
    if (!center) {
      console.log('Center not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Center not found.' });
    }

    console.log('Center deleted successfully:', center);
    res.json({ success: true, message: 'Center deleted successfully' });
  } catch (err) {
    console.error('Error deleting center:', err);
    res.status(500).json({ success: false, message: 'Failed to delete center', error: err.message });
  }
});

// Add archive/unarchive endpoint
app.put('/api/centers/:id/archive', async (req, res) => {
  try {
    console.log('Updating center archive status:', req.params.id, req.body);
    const { isArchived } = req.body;
    
    if (typeof isArchived !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isArchived must be a boolean value' });
    }

    const center = await Center.findByIdAndUpdate(
      req.params.id,
      { 
        isArchived,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!center) {
      console.log('Center not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Center not found.' });
    }

    console.log('Center archive status updated successfully:', center);
    res.json({ success: true, data: center });
  } catch (err) {
    console.error('Error updating center archive status:', err);
    res.status(500).json({ success: false, message: 'Failed to update center archive status', error: err.message });
  }
});

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
        console.log('Connected to MongoDB Atlas');
        
        // Create initial super admin after successful connection
        await createInitialSuperAdmins();
        await patchAdminAndSuperAdminIDs(); // <-- Ensure all IDs are patched on startup
        
        // Start the server only after successful database connection
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT} with WebSocket support`);
            console.log(`API endpoints available at http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Add error handlers for the server
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    switch (error.code) {
        case 'EACCES':
            console.error(`Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`Port ${PORT} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Start the connection
connectWithRetry();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// API: Get case count per center (AnimalBite + bitecases)
app.get('/api/cases-per-center', async (req, res) => {
  try {
    const centers = await Center.find({});
    // For each center, count cases in both collections
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const results = await Promise.all(centers.map(async center => {
      // Match by centerName (adjust if you use centerId in AnimalBite/bitecases)
      const animalBiteCount = await AnimalBite.countDocuments({ barangay: center.centerName });
      const biteCaseCount = await BiteCase.countDocuments({ barangay: center.centerName });
      return {
        centerName: center.centerName,
        caseCount: animalBiteCount + biteCaseCount
      };
    }));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch cases per center', error: err.message });
  }
});

// API: Get case count per center (bitecases only, match centerName in address)
app.get('/api/cases-per-center', async (req, res) => {
  try {
    const centers = await Center.find({});
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const results = await Promise.all(centers.map(async center => {
      // Use a case-insensitive regex to match centerName in address
      const biteCaseCount = await BiteCase.countDocuments({
        address: { $regex: center.centerName, $options: 'i' }
      });
      return {
        centerName: center.centerName,
        caseCount: biteCaseCount
      };
    }));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch cases per center', error: err.message });
  }
});

// API: Dashboard summary counts (patients, inventory, active cases from patients, centers, no date filter)
app.get('/api/dashboard-summary', async (req, res) => {
  try {
    // Total Patients: count from 'patients' collection
    const Patient = mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients');
    const totalPatients = await Patient.countDocuments();

    // Vaccine Stocks: sum quantity from 'vaccinestocks' collection
    const VaccineStock = mongoose.connection.model('VaccineStock', new mongoose.Schema({}, { strict: false }), 'vaccinestocks');
    const vaccineStocksAgg = await VaccineStock.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const vaccineStocks = vaccineStocksAgg[0]?.total || 0;

    // Active Cases: count from 'bitecases' collection where status is 'pending' or 'in_progress'
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const activeCases = await BiteCase.countDocuments({ status: { $in: ['pending', 'in_progress'] } });

    // Health Centers: count from 'centers' collection
    const Center = mongoose.connection.model('Center', new mongoose.Schema({}, { strict: false }), 'centers');
    const healthCenters = await Center.countDocuments();

    // Admins: count from 'admins' collection
    const Admin = mongoose.connection.model('Admin', new mongoose.Schema({}, { strict: false }), 'admins');
    const adminCount = await Admin.countDocuments();

    // Staff: count from 'staffs' collection
    const Staff = mongoose.connection.model('Staff', new mongoose.Schema({}, { strict: false }), 'staffs');
    const staffCount = await Staff.countDocuments();

    res.json({
      success: true,
      data: {
        totalPatients,
        vaccineStocks,
        activeCases,
        healthCenters,
        adminCount,
        staffCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary', error: err.message });
  }
});

// API: Get case count per barangay by searching address in bitecases (with date filter)
app.get('/api/cases-per-center', async (req, res) => {
  try {
    const filter = req.query.filter || 'month';
    let dateFrom = new Date();
    switch (filter) {
      case 'today':
        dateFrom.setHours(0,0,0,0);
        break;
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom.setDate(1);
        break;
      case 'year':
        dateFrom = new Date(dateFrom.getFullYear(), 0, 1);
        break;
    }
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const results = await Promise.all(barangays.map(async barangay => {
      const count = await BiteCase.countDocuments({
        address: { $regex: barangay, $options: 'i' },
        createdAt: { $gte: dateFrom }
      });
      return {
        centerName: barangay,
        caseCount: count
      };
    }));
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch cases per center', error: err.message });
  }
});

// List of all barangays in San Juan (add/remove as needed)
const barangays = [
  "Addition Hills", "Balong-Bato", "Batisan", "Corazon de Jesus", "Ermitaño",
  "Greenhills", "Halo-Halo", "Isabelita", "Kabayanan", "Little Baguio",
  "Maytunas", "Onse", "Pasadeña", "Pedro Cruz", "Progreso", "Rivera",
  "Salapan", "San Perfecto", "Santa Lucia", "Tibagan", "West Crame"
];

// Helper function for vaccine stock prescription
function prescribeVaccineStock(caseCount, basePerCase = 2, bufferPercent = 0.2, minStock = 50) {
  const base = caseCount * basePerCase;
  const buffer = Math.ceil(base * bufferPercent);
  return Math.max(minStock, base + buffer);
}

// API: Prescribe and allocate vaccine stocks for each barangay (detailed by severity and vaccine type)
app.get('/api/prescribe-vaccine-distribution', async (req, res) => {
  try {
    const barangays = [
      "Addition Hills", "Balong-Bato", "Batisan", "Corazon de Jesus", "Ermitaño",
      "Greenhills", "Halo-Halo", "Isabelita", "Kabayanan", "Little Baguio",
      "Maytunas", "Onse", "Pasadeña", "Pedro Cruz", "Progreso", "Rivera",
      "Salapan", "San Perfecto", "Santa Lucia", "Tibagan", "West Crame"
    ];
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const InventoryItem = mongoose.connection.model('InventoryItem', new mongoose.Schema({}, { strict: false }), 'inventoryitems');

    // Get available stock for Anti-Rabies vaccine
    const vaccineStock = await InventoryItem.aggregate([
      { $match: { type: 'Vaccine', name: /anti[- ]?rabies/i } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const availableAntiRabies = vaccineStock[0]?.total || 0;

    // For each barangay, count cases by severity
    const prescriptions = [];
    for (const barangay of barangays) {
      const cases = await BiteCase.find({ address: { $regex: barangay, $options: 'i' } });
      const severe = cases.filter(c => c.severity === 'high').length;
      const moderate = cases.filter(c => c.severity === 'medium').length;
      const mild = cases.filter(c => c.severity === 'low').length;
      const totalCases = cases.length;
      // Recommend: 3 per severe, 2 per moderate, 1 per mild, +20% buffer
      let recommended = Math.ceil((severe * 3 + moderate * 2 + mild * 1) * 1.2);
      if (totalCases > 0) recommended = Math.max(recommended, 10); // Minimum for active barangays
      const note = (availableAntiRabies < recommended) ? 'Stock insufficient!' : '';
      prescriptions.push({
        barangay,
        vaccineType: 'Anti-Rabies',
        totalCases,
        severeCases: severe,
        moderateCases: moderate,
        mildCases: mild,
        recommended,
        available: availableAntiRabies,
        note
      });
    }
    res.json({ success: true, prescriptions });
  } catch (err) {
    console.error('Error in prescribe-vaccine-distribution:', err);
    res.status(500).json({ success: false, message: 'Failed to prescribe vaccine distribution', error: err.message });
  }
});

// API: Rabies Exposure Registry Report
app.get('/api/reports/rabies-registry', async (req, res) => {
  try {
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const bitecases = await BiteCase.find({}).sort({ createdAt: 1 });
    const report = bitecases.map((p, idx) => ({
        registrationNo: p.registrationNumber || '',
        registrationDate: p.dateRegistered || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''),
      name: p.lastName && p.firstName ? `${p.lastName}, ${p.firstName}${p.middleName ? ' ' + p.middleName : ''}`.trim() : (p.patientName || ''),
        contactNo: p.contactNo || '',
        address: p.address || '',
        age: p.age || '',
      sex: p.sex || p.gender || '',
        exposureDate: p.exposureDate || '',
      animalType: p.animalType || p.exposureSource || '',
      biteType: p.biteType || p.exposureType || '',
      biteSite: p.biteSite || '',
      status: p.status || '',
      createdAt: p.createdAt || '',
    }));
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate rabies registry report', error: err.message });
  }
});

// API: Insert sample center data
app.post('/api/insert-sample-centers', async (req, res) => {
    try {
        const sampleCenters = [
            {
                centerName: "San Juan City Health Center",
                address: "N. Domingo St., San Juan City",
                contactPerson: "Dr. Maria Santos",
                contactNumber: "09123456789",
                isArchived: false,
                vaccines: [
                    { type: "Anti-Rabies", count: 150 },
                    { type: "Tetanus Toxoid", count: 100 }
                ]
            },
            {
                centerName: "Greenhills Medical Center",
                address: "Greenhills Shopping Center, San Juan City",
                contactPerson: "Dr. John Cruz",
                contactNumber: "09234567890",
                isArchived: false,
                vaccines: [
                    { type: "Anti-Rabies", count: 200 },
                    { type: "Tetanus Toxoid", count: 150 }
                ]
            },
            {
                centerName: "San Juan Medical Center",
                address: "Pinaglabanan St., San Juan City",
                contactPerson: "Dr. Robert Lim",
                contactNumber: "09345678901",
                isArchived: false,
                vaccines: [
                    { type: "Anti-Rabies", count: 180 },
                    { type: "Tetanus Toxoid", count: 120 }
                ]
            },
            {
                centerName: "Little Baguio Health Center",
                address: "Little Baguio, San Juan City",
                contactPerson: "Dr. Sarah Tan",
                contactNumber: "09456789012",
                isArchived: false,
                vaccines: [
                    { type: "Anti-Rabies", count: 120 },
                    { type: "Tetanus Toxoid", count: 80 }
                ]
            },
            {
                centerName: "Salapan Health Center",
                address: "Salapan Rd., San Juan City",
                contactPerson: "Dr. Michael Reyes",
                contactNumber: "09567890123",
                isArchived: false,
                vaccines: [
                    { type: "Anti-Rabies", count: 100 },
                    { type: "Tetanus Toxoid", count: 70 }
                ]
            }
        ];

        // Clear existing centers
        await Center.deleteMany({});
        console.log('Cleared existing centers');

        // Insert new centers
        const result = await Center.insertMany(sampleCenters);
        console.log(`Added ${result.length} sample centers`);

        res.json({ success: true, message: 'Sample centers added successfully', data: result });
    } catch (error) {
        console.error('Error adding sample centers:', error);
        res.status(500).json({ success: false, message: 'Failed to add sample centers', error: error.message });
    }
});

// API Endpoints for Prescriptive Analytics
app.get('/api/bitecases', async (req, res) => {
    try {
        // Use the correct model for the 'bitecases' collection
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        // Return all fields for each case
        const cases = await BiteCase.find({}).sort({ incidentDate: -1 });
        res.json(cases);
    } catch (error) {
        console.error('Error fetching bite cases:', error);
        res.status(500).json({ error: 'Failed to fetch bite cases' });
    }
});

app.get('/api/inventory', async (req, res) => {
    try {
        const inventory = await InventoryItem.find({ type: 'Vaccine' })
            .select('name quantity unit minThreshold expiryDate status')
            .sort({ name: 1 });
        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory data' });
    }
});

// One-time migration endpoint to split fullName into firstName, middleName, lastName
app.post('/api/migrate-staff-names', async (req, res) => {
    try {
        const staffs = await Staff.find({ fullName: { $exists: true, $ne: null } });
        let updated = 0;
        for (const staff of staffs) {
            if (!staff.firstName && staff.fullName) {
                const parts = staff.fullName.trim().split(' ');
                staff.firstName = parts[0] || '';
                if (parts.length === 3) {
                    staff.middleName = parts[1];
                    staff.lastName = parts[2];
                } else if (parts.length === 2) {
                    staff.middleName = '';
                    staff.lastName = parts[1];
                } else {
                    staff.middleName = '';
                    staff.lastName = '';
                }
                await staff.save();
                updated++;
            }
        }
        res.json({ success: true, updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/cases-per-barangay', async (req, res) => {
    try {
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const cases = await BiteCase.find({});
        const counts = {};
        cases.forEach(c => {
            const barangay = c.barangay || 'Unknown';
            counts[barangay] = (counts[barangay] || 0) + 1;
        });
        res.json({ success: true, data: Object.entries(counts).map(([barangay, count]) => ({ barangay, count })) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/patient-growth', async (req, res) => {
    try {
        const Patient = mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients');
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth()
            });
        }
        const counts = await Promise.all(months.map(async m => {
            const start = new Date(m.year, m.month, 1);
            const end = new Date(m.year, m.month + 1, 1);
            const count = await Patient.countDocuments({ createdAt: { $gte: start, $lt: end } });
            return count;
        }));
        res.json({ success: true, labels: months.map(m => m.label), data: counts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/vaccine-stock-trends', async (req, res) => {
    try {
        const InventoryItem = mongoose.connection.model('InventoryItem', new mongoose.Schema({}, { strict: false }), 'inventoryitems');
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                label: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                month: d.getMonth()
            });
        }
        // For each month, sum the quantity of all items as of the end of that month
        const data = await Promise.all(months.map(async m => {
            const end = new Date(m.year, m.month + 1, 1);
            const items = await InventoryItem.find({ lastUpdated: { $lt: end } });
            return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }));

        // FIX: For the latest month, use the current total from vaccinestocks
        if (months.length > 0) {
            const VaccineStock = mongoose.connection.model('VaccineStock', new mongoose.Schema({}, { strict: false }), 'vaccinestocks');
            const allStocks = await VaccineStock.find({});
            const currentTotal = allStocks.reduce((sum, item) => sum + (item.quantity || 0), 0);
            data[data.length - 1] = currentTotal;
        }

        res.json({ success: true, labels: months.map(m => m.label), data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/severity-distribution', async (req, res) => {
    try {
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const cases = await BiteCase.find({});
        const severityMap = { A: 'Mild', B: 'Moderate', C: 'Severe' };
        const counts = { Mild: 0, Moderate: 0, Severe: 0 };
        cases.forEach(c => {
            const sev = severityMap[c.exposureCategory];
            if (sev) counts[sev]++;
        });
        res.json({ success: true, data: counts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Animal Bite Exposure Report API
app.get('/api/reports/animal-bite-exposure', async (req, res) => {
    try {
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const cases = await BiteCase.find({}).sort({ createdAt: 1 });

    const report = cases.map((c, idx) => {
      // Patient Name: FirstName MiddleName LastName (skip missing parts)
      let name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
      if (!name && c.patientName) {
        name = c.patientName;
      }

      // Address logic
      let addressParts = [
        c.houseNo,
        c.street,
        c.barangay,
        c.subdivision,
        c.city,
        c.province,
        c.zipCode
      ];
      let address = addressParts.filter(Boolean).join(', ');

      // Bite Site logic
      let biteSite = c.biteSite || c.exposurePlace || '';

      return {
        caseNo: c.caseNo || c.registrationNumber || '',
        date: c.dateRegistered || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''),
        name,
        age: c.age || '',
        sex: c.sex || c.gender || '',
        address,
        animalType: c.animalType || c.exposureSource || '',
        biteSite,
        status: c.status || '',
        exposureDate: c.exposureDate || '',
        createdAt: c.createdAt || '',
      };
    });

    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Error in /api/reports/animal-bite-exposure:', err);
    res.status(500).json({ success: false, message: 'Failed to generate animal bite exposure report', error: err.message });
    }
});

// Rabies Utilization Report API
app.get('/api/reports/rabies-utilization', async (req, res) => {
    try {
        // You can replace this with real data aggregation if needed
        const now = new Date();
        const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const table = {
          head: ['Date', 'Vaccine Type', 'Batch No.', 'Quantity Used', 'Remaining Stock', 'Expiry Date'],
          body: [
            // Example row
            [now.toLocaleDateString(), 'Anti-Rabies', 'B123', 10, 90, '2024-12-31'],
            // ... more rows
          ]
        };
        res.json({
            success: true,
            data: {
            facilityName: 'Tibagan Health Center',
                monthYear,
                table,
            preparedBy: 'BENNETTA A. SOLISA, RN',
            preparedByTitle: 'Rabies Nurse Coordinator'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to generate rabies utilization report', error: err.message });
    }
});

// --- PATIENT REGISTRATION ENDPOINT (EXAMPLE) ---
// If you have a patient registration endpoint, add audit logging like this:
app.post('/api/patients', async (req, res) => {
    try {
        const { firstName, middleName, lastName, birthdate, gender, contactNumber, address, ...rest } = req.body;
        // Validate required fields (add as needed)
        if (!firstName || !lastName || !birthdate || !gender || !contactNumber || !address) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        // Create new patient (assuming you have a Patient model)
        const Patient = mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients');
        const newPatient = new Patient({
            firstName,
            middleName,
            lastName,
            birthdate,
            gender,
            contactNumber,
            address,
            ...rest,
            createdAt: new Date(),
            status: 'active'
        });
        await newPatient.save();
        // Log audit trail for patient registration
        await logAuditTrail(
            newPatient._id,
            'patient',
            newPatient.firstName,
            newPatient.middleName,
            newPatient.lastName,
            'Registered'
        );
        res.status(201).json({ success: true, patient: newPatient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- PATIENT UPDATE ENDPOINT (EXAMPLE) ---
app.put('/api/patients/:id', async (req, res) => {
    try {
        const Patient = mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients');
        const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        // Log audit trail for patient update
        await logAuditTrail(
            patient._id,
            'patient',
            patient.firstName,
            patient.middleName,
            patient.lastName,
            'Updated profile'
        );
        res.json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- PATIENT STATUS CHANGE (DEACTIVATE/ACTIVATE) ---
app.post('/api/patients/:id/status', async (req, res) => {
    try {
        const { status } = req.body; // e.g., 'active', 'inactive', 'deceased'
        const Patient = mongoose.connection.model('Patient', new mongoose.Schema({}, { strict: false }), 'patients');
        const patient = await Patient.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        // Log audit trail for status change
        await logAuditTrail(
            patient._id,
            'patient',
            patient.firstName,
            patient.middleName,
            patient.lastName,
            `Status changed to ${status}`
        );
        res.json({ success: true, patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- VaccineStocks Schema and API ---
const vaccineStockSchema = new mongoose.Schema({
  center: String,
  vaccineName: String,
  quantity: Number,
  expiryDate: Date,
  batchNumber: String,
  minThreshold: Number,
  status: String,
  lastUpdated: { type: Date, default: Date.now }
}, { collection: 'vaccinestocks' });

const VaccineStock = mongoose.model('VaccineStock', vaccineStockSchema);

// API: Get all vaccine stocks
app.get('/api/vaccinestocks', async (req, res) => {
  try {
    const stocks = await VaccineStock.find({}).sort({ lastUpdated: -1 });
    res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('Error fetching vaccine stocks:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch vaccine stocks', error: err.message });
    }
});

// Helper to generate next adminID or superAdminID
async function getNextAdminID() {
    const lastAdmin = await Admin.findOne({}).sort({ adminID: -1 }).select('adminID');
    let next = 1;
    if (lastAdmin && lastAdmin.adminID) {
        const num = parseInt(lastAdmin.adminID.replace('AD', ''));
        if (!isNaN(num)) next = num + 1;
    }
    return `AD${String(next).padStart(3, '0')}`;
}
async function getNextSuperAdminID() {
    const lastSuper = await SuperAdmin.findOne({}).sort({ superAdminID: -1 }).select('superAdminID');
    let next = 1;
    if (lastSuper && lastSuper.superAdminID) {
        const num = parseInt(lastSuper.superAdminID.replace('SA', ''));
        if (!isNaN(num)) next = num + 1;
    }
    return `SA${String(next).padStart(3, '0')}`;
}

// Helper to get the correct audit user ID
function getAuditUserId(user) {
    if (!user) return '';
    if (user.role === 'admin' && user.adminID) return user.adminID;
    if (user.role === 'superadmin' && user.superAdminID) return user.superAdminID;
    if (user.role === 'staff' && user.staffID) return user.staffID;
    if (user.role === 'patient' && user.patientID) return user.patientID;
    return user._id;
}

// Get service hours for a center
app.get('/api/centers/:id/service-hours', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);
    if (!center) return res.status(404).json({ success: false, message: 'Center not found' });
    res.json({ success: true, serviceHours: center.serviceHours || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch service hours', error: err.message });
  }
});

// Update service hours for a center
app.put('/api/centers/:id/service-hours', async (req, res) => {
  try {
    const { serviceHours } = req.body;
    if (!Array.isArray(serviceHours)) return res.status(400).json({ success: false, message: 'Invalid service hours format' });
    const center = await Center.findByIdAndUpdate(
      req.params.id,
      { serviceHours, lastUpdated: new Date() },
      { new: true }
    );
    if (!center) return res.status(404).json({ success: false, message: 'Center not found' });
    res.json({ success: true, serviceHours: center.serviceHours });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update service hours', error: err.message });
  }
});

// API: Custom Demographic Report
app.get('/api/reports/demographic', async (req, res) => {
  try {
    const { sex = 'all', ageGroup = 'all' } = req.query;
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    let filter = {};
    if (sex && sex !== 'all') {
      filter.$or = [
        { sex: sex },
        { gender: sex },
        { sex: sex.charAt(0) },
        { gender: sex.charAt(0) }
      ];
    }
    if (ageGroup && ageGroup !== 'all') {
      let ageCond = {};
      if (ageGroup === '0-5') ageCond = { $gte: 0, $lte: 5 };
      else if (ageGroup === '6-12') ageCond = { $gte: 6, $lte: 12 };
      else if (ageGroup === '13-18') ageCond = { $gte: 13, $lte: 18 };
      else if (ageGroup === '19-35') ageCond = { $gte: 19, $lte: 35 };
      else if (ageGroup === '36-60') ageCond = { $gte: 36, $lte: 60 };
      else if (ageGroup === '61+') ageCond = { $gte: 61 };
      if (Object.keys(ageCond).length > 0) filter.age = ageCond;
    }
    const cases = await BiteCase.find(filter).sort({ createdAt: 1 });
    const report = cases.map((p, idx) => ({
      registrationNo: p.registrationNumber || '',
      registrationDate: p.dateRegistered || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''),
      name: p.lastName && p.firstName ? `${p.lastName}, ${p.firstName}${p.middleName ? ' ' + p.middleName : ''}`.trim() : (p.patientName || ''),
      sex: p.sex || p.gender || '',
      age: p.age || '',
      exposureDate: p.exposureDate || '',
      animalType: p.animalType || p.exposureSource || '',
      biteType: p.biteType || p.exposureType || '',
      biteSite: p.biteSite || '',
      address: p.address || '',
      contactNo: p.contactNo || '',
      status: p.status || '',
      createdAt: p.createdAt || '',
    }));
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate demographic report', error: err.message });
  }
});

// --- General Report (NEW ENDPOINT) ---
app.get('/api/reports/general', async (req, res) => {
  try {
    const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
    const cases = await BiteCase.find({}).sort({ createdAt: 1 });
    const report = cases.map((c, idx) => ({
      registrationNo: c.registrationNumber || '',
      registrationDate: c.dateRegistered || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''),
      name: c.lastName && c.firstName ? `${c.lastName}, ${c.firstName}${c.middleName ? ' ' + c.middleName : ''}`.trim() : (c.patientName || ''),
      sex: c.sex || c.gender || '',
      age: c.age || '',
      address: c.address || '',
      contactNo: c.contactNo || '',
      barangay: c.barangay || '',
      animalType: c.animalType || c.exposureSource || '',
      biteType: c.biteType || c.exposureType || '',
      biteSite: c.biteSite || '',
      exposureDate: c.exposureDate || '',
      status: c.status || '',
      createdAt: c.createdAt || '',
      // Add any other fields you want to include
    }));
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate general report', error: err.message });
  }
});