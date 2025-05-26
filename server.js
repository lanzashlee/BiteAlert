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
    serverSelectionTimeoutMS: 60000, // Increased to 60 seconds
    socketTimeoutMS: 60000, // Increased to 60 seconds
    connectTimeoutMS: 60000, // Added connect timeout
    family: 4,
    maxPoolSize: 10 // Added connection pool size
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
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    resetOTP: String,
    resetOTPExpires: Date
});

const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    role: { type: String, required: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    action: { type: String, required: true }
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
    isApproved: { type: Boolean, default: false }
});
const Staff = mongoose.model('Staff', staffSchema, 'staffs');

const Admin = mongoose.model('Admin', adminSchema);
const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
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

// Default SuperAdmin Account
const DEFAULT_SUPERADMIN = {
    id: "681a4d793a6a72d951d31394",
    firstName: "SuperAdmin",
    middleName: "",
    lastName: "Admin",
    email: "admin@bitealert.com",
    phoneNumber: "09123456789",
    birthdate: new Date("1990-01-01"),
    password: "Admin123!",
    role: "superadmin"
};

// Initialize SuperAdmin Account
async function createInitialSuperAdmin() {
    try {
        const existingUser = await SuperAdmin.findOne({ email: DEFAULT_SUPERADMIN.email });
        if (existingUser) {
            // Update existing superadmin's password
            const hashedPassword = await bcrypt.hash(DEFAULT_SUPERADMIN.password, 10);
            existingUser.password = hashedPassword;
            await existingUser.save();
            console.log('Existing SuperAdmin account password updated successfully');
        } else {
            // Create new superadmin
            const hashedPassword = await bcrypt.hash(DEFAULT_SUPERADMIN.password, 10);
            const superAdmin = new SuperAdmin({
                firstName: DEFAULT_SUPERADMIN.firstName,
                middleName: DEFAULT_SUPERADMIN.middleName,
                lastName: DEFAULT_SUPERADMIN.lastName,
                email: DEFAULT_SUPERADMIN.email,
                phoneNumber: DEFAULT_SUPERADMIN.phoneNumber,
                birthdate: DEFAULT_SUPERADMIN.birthdate,
                password: hashedPassword,
                role: DEFAULT_SUPERADMIN.role
            });
            await superAdmin.save();
            console.log('New SuperAdmin account created successfully');
        }
    } catch (error) {
        console.error('Error managing SuperAdmin account:', error);
    }
}

// Function to log audit trail
async function logAuditTrail(userId, role, firstName, middleName, lastName, action) {
    try {
        const auditLog = new AuditLog({
            userId,
            role,
            firstName,
            middleName,
            lastName,
            action
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

        // Create new admin
        const newAdmin = new Admin({
            firstName,
            middleName,
            lastName,
            email: email.toLowerCase(),
            phoneNumber,
            birthdate,
            password: hashedPassword,
            role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Save the admin to the database
        await newAdmin.save();
        console.log('New admin created successfully:', newAdmin); // Debug log

        // Log the action
        await logAuditTrail(
            newAdmin._id,
            newAdmin.role,
            newAdmin.firstName,
            newAdmin.middleName,
            newAdmin.lastName,
            'CREATE_ACCOUNT'
        );

        // Broadcast the update to all connected clients
        broadcastUpdate({
            type: 'newAccount',
            account: {
                id: newAdmin._id,
                firstName: newAdmin.firstName,
                middleName: newAdmin.middleName,
                lastName: newAdmin.lastName,
                email: newAdmin.email,
                role: newAdmin.role,
                isActive: newAdmin.isActive
            }
        });

        return res.status(200).json({ 
            success: true, 
            message: 'Account created successfully',
            user: {
                id: newAdmin._id,
                firstName: newAdmin.firstName,
                middleName: newAdmin.middleName,
                lastName: newAdmin.lastName,
                email: newAdmin.email,
                role: newAdmin.role
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

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check SuperAdmin collection first
        let user = await SuperAdmin.findOne({ email });
        let userType = 'superadmin';

        // If not found, check Admin collection
        if (!user) {
            user = await Admin.findOne({ email });
            userType = user ? user.role : null;
        }

        if (!user) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Validate password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if admin account is active (only for regular admins)
        if (userType === 'admin' && !user.isActive) {
            return res.json({
                success: false,
                message: 'Your account has been deactivated. Please contact a super admin.'
            });
        }

        // Add audit log after successful login
        await logAuditTrail(user._id, userType, user.firstName, user.middleName, user.lastName, 'Signed in');

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
                isActive: user.isActive || true
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

// Admin Login Route
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // First check in Admin collection for admin
        let user = await Admin.findOne({ email, role: 'admin' });
        let userType = 'admin';

        // If not found in Admin collection, check SuperAdmin collection
        if (!user) {
            user = await SuperAdmin.findOne({ email });
            userType = 'superadmin';
        }

        // If no user found with that email
        if (!user) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if admin account is active (only for regular admins)
        if (userType === 'admin' && !user.isActive) {
            return res.json({
                success: false,
                message: 'Your account has been deactivated. Please contact a super admin.'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Log the successful login
        await logAuditTrail(user._id, user.role, user.firstName, user.middleName, user.lastName, 'Logged in to admin portal');

        // Send success response with user info
        res.json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                role: userType,
                isActive: user.isActive
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

        // Add audit log after successful login
        await logAuditTrail(user._id, userType, user.firstName, user.middleName, user.lastName, 'Signed in');
        
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
                isActive: userType === 'superadmin' ? true : user.isActive
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

        // Add date range to query if provided
        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) {
                query.timestamp.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                query.timestamp.$lte = new Date(dateTo);
            }
        }

        // Add role filter if provided
        if (role) {
            query.role = new RegExp(role, 'i');
        }

        console.log('Fetching audit logs with query:', query);
        
        const auditLogs = await AuditLog.find(query)
            .sort({ timestamp: -1 }) // Sort by newest first
            .limit(100); // Limit to last 100 entries

        console.log(`Found ${auditLogs.length} audit log entries:`, auditLogs);
        
        res.json(auditLogs);
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ message: 'Error fetching audit trail' });
    }
});

// Modify your existing logout endpoint or add one if it doesn't exist
app.post('/api/logout', async (req, res) => {
    try {
        const { userId, role, firstName, middleName, lastName } = req.body;
        await logAuditTrail(userId, role, firstName, middleName, lastName, 'Signed out');
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
                .select('_id firstName middleName lastName email createdAt isActive')
                .lean(),
            SuperAdmin.find()
                .select('_id firstName middleName lastName email createdAt')
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
                isActive: true
            })),
            ...adminUsers.map(admin => ({
                id: admin._id,
                username: admin.email,
                firstName: admin.firstName,
                middleName: admin.middleName,
                lastName: admin.lastName,
                role: 'admin',
                createdAt: admin.createdAt,
                isActive: admin.isActive
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
            user._id,
            user.role,
            user.firstName,
            user.middleName,
            user.lastName,
            `Account ${isActiveBoolean ? 'activated' : 'deactivated'}`
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
                isActive: user.isActive
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
                isActive: user.isActive
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
                isActive: user.isActive,
                createdAt: user.createdAt
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
                    isActive: true, // SuperAdmins are always active
                    createdAt: superAdmin.createdAt
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

        const activities = await AuditLog.find(activityQuery).sort({ timestamp: -1 });

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
            role: user.role
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
        await logAuditTrail(
            userId,
            isSuperAdmin ? 'superadmin' : 'admin',
            firstName,
            middleName,
            lastName,
            'Updated profile information'
        );

        res.json({
            message: 'Profile updated successfully',
            user: {
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
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
        await logAuditTrail(
            userId,
            isSuperAdmin ? 'superadmin' : 'admin',
            user.firstName,
            user.middleName,
            user.lastName,
            'Changed password'
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
        const staff = await Staff.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        // Log staff approval
        let firstName = staff.fullName;
        let lastName = '';
        if (staff.fullName && staff.fullName.includes(' ')) {
            const parts = staff.fullName.split(' ');
            firstName = parts[0];
            lastName = parts.slice(1).join(' ');
        }
        await logAuditTrail(
            staff._id,
            staff.role,
            firstName,
            '',
            lastName,
            'Staff approved'
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
        await logAuditTrail(
            staff._id,
            staff.role,
            firstName,
            '',
            lastName,
            'Staff rejected/deleted'
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
        await logAuditTrail(
            staff._id,
            staff.role,
            firstName,
            '',
            lastName,
            'Staff deactivated'
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
        await logAuditTrail(
            staff._id,
            staff.role,
            firstName,
            '',
            lastName,
            'Staff activated'
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
  lastUpdated: { type: Date, default: Date.now }
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

// Connect to MongoDB with retry logic
const connectWithRetry = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGODB_URI, MONGODB_OPTIONS);
        console.log('Connected to MongoDB Atlas');
        
        // Create initial super admin after successful connection
        await createInitialSuperAdmin();
        
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
    const report = bitecases.map((p, idx) => {
      let name = '';
      if (typeof p.lastName !== 'undefined' && typeof p.firstName !== 'undefined') {
        name = `${p.lastName || ''}, ${p.firstName || ''}${p.middleName ? ' ' + p.middleName : ''}`.trim();
      } else if (p.patientName) {
        name = p.patientName;
      } else {
        name = '';
      }
      return {
        registrationNo: p.registrationNumber || '',
        registrationDate: p.dateRegistered || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''),
        name,
        contactNo: p.contactNo || '',
        address: p.address || '',
        dateOfBirth: p.dateOfBirth || '',
        age: p.age || '',
        sex: p.sex || '',
        exposureDate: p.exposureDate || '',
        exposurePlace: p.exposurePlace || '',
        animalType: p.exposureSource || '',
        biteType: p.exposureType || '',
        biteSite: '', // Not present in your data
      };
    });
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
        const cases = await BiteCase.find({})
            .select('patientName age gender barangay incidentDate animalType vaccinationStatus woundLocation severity treatmentGiven followUpDate status')
            .sort({ incidentDate: -1 });
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
        // These values can be dynamic or from query params in the future
        const facilityName = 'Tibagan Health Center';
        const lgu = 'San Juan City';
        const dateSubmitted = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const now = new Date();
        const year = now.getFullYear();
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        const preparedBy = 'BENNETTA A. SOLISA, RN';
        const preparedByTitle = 'Rabies Nurse Coordinator';

        // Fetch bite cases for this facility and quarter/year
        const BiteCase = mongoose.connection.model('BiteCase', new mongoose.Schema({}, { strict: false }), 'bitecases');
        const startQuarter = new Date(year, (quarter - 1) * 3, 1);
        const endQuarter = new Date(year, quarter * 3, 1);
        const cases = await BiteCase.find({
            barangay: { $regex: facilityName, $options: 'i' },
            createdAt: { $gte: startQuarter, $lt: endQuarter }
        });

        // Aggregate data for the table (simplified example)
        // You can expand this to match the full form structure
        let male = 0, female = 0, ageBelow15 = 0, ageAbove15 = 0, dog = 0, cat = 0, others = 0;
        let catI = 0, catII = 0, catIII = 0, tcv = 0, erig = 0, hrig = 0;
        cases.forEach(c => {
            if (c.sex === 'M' || c.gender === 'Male') male++;
            if (c.sex === 'F' || c.gender === 'Female') female++;
            if (c.age < 15) ageBelow15++;
            if (c.age >= 15) ageAbove15++;
            if (c.animalType === 'Dog') dog++;
            if (c.animalType === 'Cat') cat++;
            if (c.animalType && !['Dog', 'Cat'].includes(c.animalType)) others++;
            if (c.exposureCategory === 'I') catI++;
            if (c.exposureCategory === 'II') catII++;
            if (c.exposureCategory === 'III') catIII++;
            if (c.immunization && c.immunization.includes('TCV')) tcv++;
            if (c.immunization && c.immunization.includes('ERIG')) erig++;
            if (c.immunization && c.immunization.includes('HRIG')) hrig++;
        });
        const table = {
            head: [
                'Sex (M)', 'Sex (F)', '< 15', '>= 15', 'Dog', 'Cat', 'Others',
                'Category I', 'Category II', 'Category III', 'TCV', 'ERIG', 'HRIG', 'Total'
            ],
            body: [[
                male, female, ageBelow15, ageAbove15, dog, cat, others,
                catI, catII, catIII, tcv, erig, hrig, cases.length
            ]]
        };
        res.json({
            success: true,
            data: {
                facilityName,
                lgu,
                dateSubmitted,
                quarter,
                year,
                preparedBy,
                preparedByTitle,
                table
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Rabies Utilization Report API
app.get('/api/reports/rabies-utilization', async (req, res) => {
    try {
        // These values can be dynamic or from query params in the future
        const facilityName = 'Tibagan Health Center';
        const now = new Date();
        const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        const preparedBy = 'BENNETTA A. SOLISA, RN';
        const preparedByTitle = 'Rabies Nurse Coordinator';
        // Table columns as in the sample
        const table = {
            head: [
                'DATE',
                'POST-EXPOSURE PATIENT (2 DOSES/PATIENT)',
                'BOOSTER PATIENT (1 DOSE/PATIENT)',
                'TOTAL NO. OF PATIENTS/DAY',
                'TOTAL NO. OF DOSES GIVEN/DAY',
                'TOTAL NO. OF USED VIAL/DAY',
                'ERIG PATIENT/DAY',
                'USED VIAL/DAY',
                'TETANUS TOXOID USED VIAL/DAY'
            ],
            body: []
        };
        // Generate mock data for each day of the current month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(now.getFullYear(), now.getMonth(), d);
            table.body.push([
                date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                Math.floor(Math.random() * 5), // post-exposure
                Math.floor(Math.random() * 3), // booster
                Math.floor(Math.random() * 8), // total patients
                Math.floor(Math.random() * 10), // total doses
                Math.floor(Math.random() * 4), // used vials
                Math.floor(Math.random() * 2), // ERIG
                Math.floor(Math.random() * 3), // used vial/day
                Math.floor(Math.random() * 2)  // tetanus toxoid
            ]);
        }
        // Add TOTAL row
        table.body.push([
            'TOTAL',
            ...Array(table.head.length - 1).fill('')
        ]);
        res.json({
            success: true,
            data: {
                facilityName,
                monthYear,
                table,
                preparedBy,
                preparedByTitle
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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