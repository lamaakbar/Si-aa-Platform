// server.js - Backend API for Si'aa Dashboard
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// SQL Server Configuration
const config = {
    user: process.env.DB_USER || 'Lama1292',
    password: process.env.DB_PASSWORD || 'Lama123!!',
    server: process.env.DB_SERVER || 'siaa.database.windows.net',
    database: process.env.DB_NAME || 'Siaa',
    options: {
        encrypt: true, // Use encryption for Azure
        trustServerCertificate: true // Trust self-signed certificate for local dev
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Global connection pool
let poolPromise;

// Initialize database connection
const initializeDB = async () => {
    try {
        poolPromise = await sql.connect(config);
        console.log('Connected to SQL Server successfully');
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
};

// Hash password using SHA-256
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// =============================================
// AUTHENTICATION ENDPOINTS
// =============================================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const hashedPassword = hashPassword(password);
        const pool = await poolPromise;

        let user = null;
        let userType = null;

        // Try to find user in StorageSeekers first
        try {
            const seekerQuery = `
                SELECT 
                    SeekerID as UserID,
                    Email,
                    FirstName,
                    LastName,
                    PhoneNumber,
                    AccountStatus,
                    IsVerified,
                    'seeker' as UserType
                FROM StorageSeekers
                WHERE Email = @email AND Password = @password
            `;

            const seekerResult = await pool.request()
                .input('email', sql.NVarChar, email)
                .input('password', sql.NVarChar, hashedPassword)
                .query(seekerQuery);

            if (seekerResult.recordset.length > 0) {
                user = seekerResult.recordset[0];
                userType = 'seeker';
            }
        } catch (err) {
            console.error('Error checking seeker:', err);
        }

        // If not found in seekers, try providers
        if (!user) {
            try {
                const providerQuery = `
                    SELECT 
                        ProviderID as UserID,
                        Email,
                        FirstName,
                        LastName,
                        PhoneNumber,
                        AccountStatus,
                        IsVerified,
                        BusinessName,
                        'provider' as UserType
                    FROM StorageProviders
                    WHERE Email = @email AND Password = @password
                `;

                const providerResult = await pool.request()
                    .input('email', sql.NVarChar, email)
                    .input('password', sql.NVarChar, hashedPassword)
                    .query(providerQuery);

                if (providerResult.recordset.length > 0) {
                    user = providerResult.recordset[0];
                    userType = 'provider';
                }
            } catch (err) {
                console.error('Error checking provider:', err);
            }
        }

        // If no user found in either table
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.AccountStatus !== 'Active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        // Generate a simple session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        res.json({
            success: true,
            user: {
                id: user.UserID,
                email: user.Email,
                firstName: user.FirstName,
                lastName: user.LastName,
                phone: user.PhoneNumber,
                accountStatus: user.AccountStatus,
                isVerified: user.IsVerified,
                userType: user.UserType,
                businessName: user.BusinessName || null
            },
            token: sessionToken
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        // accept fields sent by the frontend (camelCase or PascalCase both handled)
        const {
            fullName,
            email,
            phone,
            password,
            accountType,

            // optional / DB-aligned fields
            FirstName,
            LastName,
            DateOfBirth,
            Gender,
            NationalID,
            CompanyName,
            ContentType,
            ProfilePicture, // expected as data URL (e.g. "data:image/jpeg;base64,...")
            IsVerified,
            VerificationDate,
            AccountStatus
        } = req.body;

        // Basic validation
        if (!fullName || !email || !phone || !password || !accountType) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Normalize / derive firstName/lastName if not provided
        const nameParts = (fullName || '').trim().split(/\s+/).filter(Boolean);
        const firstName = FirstName || (nameParts.length ? nameParts[0] : '');
        const lastName = LastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName);

        const userType = accountType.toLowerCase(); // 'seeker' or 'provider'
        if (!['seeker', 'provider'].includes(userType)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        const hashedPassword = hashPassword(password);
        const pool = await poolPromise;

        // Check if email already exists (use explicit sizes)
        const checkQuery = userType === 'seeker'
            ? 'SELECT Email FROM StorageSeekers WHERE Email = @email'
            : 'SELECT Email FROM StorageProviders WHERE Email = @email';

        const checkResult = await pool.request()
            .input('email', sql.NVarChar(256), email)
            .query(checkQuery);

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Check if NationalID already exists
        if (NationalID) {
            const nationalIdCheckQuery = userType === 'seeker'
                ? 'SELECT NationalID FROM StorageSeekers WHERE NationalID = @nationalId'
                : 'SELECT NationalID FROM StorageProviders WHERE NationalID = @nationalId';

            const nationalIdResult = await pool.request()
                .input('nationalId', sql.NVarChar(100), NationalID)
                .query(nationalIdCheckQuery);

            if (nationalIdResult.recordset.length > 0) {
                return res.status(409).json({ error: 'National ID already exists' });
            }
        }

        if (DateOfBirth) {
            const birthDate = new Date(DateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) {
                return res.status(400).json({ error: 'You must be at least 18 years old to register.' });
            }
        }
        // Convert ProfilePicture data URL to Buffer if provided
        let profilePictureBuffer = null;
        let contentType = ContentType || null;
        if (ProfilePicture && typeof ProfilePicture === 'string') {
            const matches = ProfilePicture.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                contentType = contentType || matches[1];
                const base64Data = matches[2];
                profilePictureBuffer = Buffer.from(base64Data, 'base64');
            } else {
                // not a data URL — ignore or handle accordingly
                profilePictureBuffer = null;
            }
        }

        const accountStatus = AccountStatus || 'Active';
        const isVerified = typeof IsVerified !== 'undefined' ? Number(IsVerified) : 0;
        const verificationDate = VerificationDate || null;

        // Prepare insertion
        let result;

        if (userType === 'seeker') {
            // Insert into StorageSeekers (columns must exist in DB)
            const insertQuery = `
                INSERT INTO StorageSeekers (
                    Email, Password, FirstName, LastName, PhoneNumber,
                    DateOfBirth, Gender, ContentType, ProfilePicture, NationalID,
                    IsVerified, VerificationDate, AccountStatus,
                    CompanyName,
                    RegistrationDate
                )
                OUTPUT INSERTED.SeekerID, INSERTED.Email, INSERTED.FirstName, INSERTED.LastName,
                       INSERTED.PhoneNumber, INSERTED.AccountStatus, INSERTED.IsVerified
                VALUES (
                    @email, @password, @firstName, @lastName, @phone,
                    @dateOfBirth, @gender, @contentType, @profilePicture, @nationalId,
                    @isVerified, @verificationDate, @accountStatus,
                    @companyName,
                    GETDATE()
                )
            `;

            const request = pool.request()
                .input('email', sql.NVarChar(256), email)
                .input('password', sql.NVarChar(64), hashedPassword)
                .input('firstName', sql.NVarChar(200), firstName)
                .input('lastName', sql.NVarChar(200), lastName)
                .input('phone', sql.NVarChar(32), phone)
                .input('dateOfBirth', sql.Date, DateOfBirth || null)
                .input('gender', sql.NVarChar(20), Gender || null)
                .input('contentType', sql.NVarChar(100), contentType || null)
                .input('profilePicture', sql.VarBinary(sql.MAX), profilePictureBuffer) // VARBINARY(MAX)
                .input('nationalId', sql.NVarChar(100), NationalID || null)
                .input('isVerified', sql.Bit, isVerified ? 1 : 0)
                .input('verificationDate', sql.DateTime2, verificationDate || null)
                .input('accountStatus', sql.NVarChar(50), accountStatus)
                .input('companyName', sql.NVarChar(200), CompanyName || null)

            result = await request.query(insertQuery);

        } else {
            // Provider insertion 
            const insertQuery = `
            INSERT INTO StorageProviders (
                Email, Password, FirstName, LastName, PhoneNumber,
                DateOfBirth, Gender, ContentType, ProfilePicture, NationalID,
                BusinessName, AccountStatus, IsVerified, VerificationDate,
                RegistrationDate
            )
            OUTPUT INSERTED.ProviderID, INSERTED.Email, INSERTED.FirstName,
                   INSERTED.LastName, INSERTED.PhoneNumber, INSERTED.AccountStatus,
                   INSERTED.IsVerified, INSERTED.BusinessName
            VALUES (
                @email, @password, @firstName, @lastName, @phone,
                @dateOfBirth, @gender, @contentType, @profilePicture, @nationalId,
                @businessName, @accountStatus, @isVerified, @verificationDate,
                GETDATE()
            )
        `;

            const request = pool.request()
                .input('email', sql.NVarChar, email)
                .input('password', sql.NVarChar, hashedPassword)
                .input('firstName', sql.NVarChar, firstName)
                .input('lastName', sql.NVarChar, lastName)
                .input('phone', sql.NVarChar, phone)
                .input('dateOfBirth', sql.Date, DateOfBirth || null)
                .input('gender', sql.NVarChar, Gender || null)
                .input('contentType', sql.NVarChar, contentType || null)
                .input('profilePicture', sql.VarBinary(sql.MAX), profilePictureBuffer)
                .input('nationalId', sql.NVarChar, NationalID || null)
                .input('businessName', sql.NVarChar, CompanyName || null)
                .input('accountStatus', sql.NVarChar, accountStatus)
                .input('isVerified', sql.Bit, isVerified ? 1 : 0)
                .input('verificationDate', sql.DateTime2, verificationDate || null);

            result = await request.query(insertQuery);
        }

        const newUser = result.recordset && result.recordset[0];

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Return user data (normalize fields)
        res.status(201).json({
            success: true,
            user: {
                id: newUser.SeekerID || newUser.ProviderID,
                email: newUser.Email,
                firstName: newUser.FirstName,
                lastName: newUser.LastName,
                phone: newUser.PhoneNumber,
                accountStatus: newUser.AccountStatus,
                isVerified: newUser.IsVerified,
                userType: userType
            },
            token: sessionToken
        });

    } catch (err) {
        console.error('Registration error:', err);

        // SQL Server duplicate key error handling
        if (err && err.number === 2627) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        res.status(500).json({ error: 'Server error during registration' });
    }
});

// =============================================
// PROFILE ENDPOINTS
// =============================================

// Get user profile
app.get('/api/profile/:userType/:userId', async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const pool = await poolPromise;

        let query;

        if (userType === 'seeker') {
            query = `
                SELECT 
                    SeekerID as UserID,
                    Email,
                    FirstName,
                    LastName,
                    PhoneNumber,
                    DateOfBirth,
                    Gender,
                    NationalID,
                    IsVerified,
                    AccountStatus,
                    RegistrationDate,
                    CompanyName
                FROM StorageSeekers
                WHERE SeekerID = @userId
            `;
        } else if (userType === 'provider') {
            query = `
                SELECT 
                    ProviderID as UserID,
                    Email,
                    FirstName,
                    LastName,
                    PhoneNumber,
                    DateOfBirth,
                    Gender,
                    NationalID,
                    IsVerified,
                    AccountStatus,
                    RegistrationDate,
                    LastLoginDate,
                    BusinessName,
                    BankAccountNumber,
                    BankName,
                    IBAN,
                    CommissionRate
                FROM StorageProviders
                WHERE ProviderID = @userId
            `;
        } else {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            profile: result.recordset[0]
        });

    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Server error fetching profile' });
    }
});

// Update user profile
app.put('/api/profile/:userType/:userId', async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const { firstName, lastName, phoneNumber } = req.body;
        const pool = await poolPromise;

        let query;

        if (userType === 'seeker') {
            query = `
                UPDATE StorageSeekers
                SET FirstName = @firstName,
                    LastName = @lastName,
                    PhoneNumber = @phoneNumber,
                    UpdatedAt = GETDATE()
                WHERE SeekerID = @userId
            `;
        } else if (userType === 'provider') {
            query = `
                UPDATE StorageProviders
                SET FirstName = @firstName,
                    LastName = @lastName,
                    PhoneNumber = @phoneNumber,
                    UpdatedAt = GETDATE()
                WHERE ProviderID = @userId
            `;
        } else {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('firstName', sql.NVarChar, firstName)
            .input('lastName', sql.NVarChar, lastName)
            .input('phoneNumber', sql.NVarChar, phoneNumber)
            .query(query);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Server error updating profile' });
    }
});

// =============================================
// SEEKER-SPECIFIC ENDPOINTS
// =============================================

// Get seeker bookings
app.get('/api/seeker/:seekerId/bookings', async (req, res) => {
    try {
        const { seekerId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('seekerId', sql.Int, seekerId)
            .query(`
                SELECT 
                    b.BookingID,
                    b.StartDate,
                    b.EndDate,
                    b.TotalAmount,
                    b.BookingStatus,
                    b.CreatedAt,
                    s.Title as SpaceTitle,
                    s.SpaceType,
                    s.Size,
                    l.City,
                    l.AddressLine1,
                    p.FirstName + ' ' + p.LastName as ProviderName,
                    p.PhoneNumber as ProviderPhone
                FROM Bookings b
                JOIN StorageSpaces s ON b.SpaceID = s.SpaceID
                JOIN StorageProviders p ON s.ProviderID = p.ProviderID
                LEFT JOIN Locations l ON s.SpaceID = l.SpaceID
                WHERE b.SeekerID = @seekerId
                ORDER BY b.CreatedAt DESC
            `);

        res.json({
            success: true,
            bookings: result.recordset
        });

    } catch (err) {
        console.error('Bookings fetch error:', err);
        res.status(500).json({ error: 'Server error fetching bookings' });
    }
});

// Get seeker statistics
app.get('/api/seeker/:seekerId/statistics', async (req, res) => {
    try {
        const { seekerId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('seekerId', sql.Int, seekerId)
            .query(`
                SELECT 
                    COUNT(*) as TotalBookings,
                    SUM(CASE WHEN BookingStatus = 'Active' THEN 1 ELSE 0 END) as ActiveBookings,
                    SUM(CASE WHEN BookingStatus = 'Pending' THEN 1 ELSE 0 END) as PendingBookings,
                    SUM(CASE WHEN BookingStatus = 'Completed' THEN 1 ELSE 0 END) as CompletedBookings,
                    ISNULL(SUM(TotalAmount), 0) as TotalSpent
                FROM Bookings
                WHERE SeekerID = @seekerId
            `);

        res.json({
            success: true,
            statistics: result.recordset[0]
        });

    } catch (err) {
        console.error('Statistics fetch error:', err);
        res.status(500).json({ error: 'Server error fetching statistics' });
    }
});

// =============================================
// PROVIDER-SPECIFIC ENDPOINTS
// =============================================

// Get provider spaces
app.get('/api/provider/:providerId/spaces', async (req, res) => {
    try {
        const { providerId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('providerId', sql.Int, providerId)
            .query(`
                SELECT 
                    s.SpaceID,
                    s.Title,
                    s.Description,
                    s.SpaceType,
                    s.Size,
                    s.PricePerMonth,
                    s.IsAvailable,
                    s.Status,
                    s.FavoriteCount,
                    s.CreatedAt,
                    l.City,
                    l.AddressLine1,
                    (SELECT COUNT(*) FROM Bookings WHERE SpaceID = s.SpaceID) as TotalBookings,
                    (SELECT COUNT(*) FROM Bookings WHERE SpaceID = s.SpaceID AND BookingStatus = 'Active') as ActiveBookings
                FROM StorageSpaces s
                LEFT JOIN Locations l ON s.SpaceID = l.SpaceID
                WHERE s.ProviderID = @providerId
                ORDER BY s.CreatedAt DESC
            `);

        res.json({
            success: true,
            spaces: result.recordset
        });

    } catch (err) {
        console.error('Spaces fetch error:', err);
        res.status(500).json({ error: 'Server error fetching spaces' });
    }
});

// Get provider statistics
app.get('/api/provider/:providerId/statistics', async (req, res) => {
    try {
        const { providerId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('providerId', sql.Int, providerId)
            .query(`
                SELECT 
                    COUNT(DISTINCT s.SpaceID) as TotalSpaces,
                    SUM(CASE WHEN s.Status = 'Active' THEN 1 ELSE 0 END) as ActiveSpaces,
                    SUM(CASE WHEN s.Status = 'Pending' THEN 1 ELSE 0 END) as PendingSpaces,
                    COUNT(DISTINCT b.BookingID) as TotalBookings,
                    ISNULL(SUM(b.TotalAmount), 0) as TotalRevenue,
                    ISNULL(SUM(CASE WHEN b.BookingStatus = 'Active' THEN b.TotalAmount ELSE 0 END), 0) as ActiveRevenue
                FROM StorageSpaces s
                LEFT JOIN Bookings b ON s.SpaceID = b.SpaceID
                WHERE s.ProviderID = @providerId
            `);

        res.json({
            success: true,
            statistics: result.recordset[0]
        });

    } catch (err) {
        console.error('Statistics fetch error:', err);
        res.status(500).json({ error: 'Server error fetching statistics' });
    }
});

// Get provider bookings
app.get('/api/provider/:providerId/bookings', async (req, res) => {
    try {
        const { providerId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('providerId', sql.Int, providerId)
            .query(`
                SELECT 
                    b.BookingID,
                    b.StartDate,
                    b.EndDate,
                    b.TotalAmount,
                    b.BookingStatus,
                    b.CreatedAt,
                    s.Title as SpaceTitle,
                    s.SpaceType,
                    sk.FirstName + ' ' + sk.LastName as SeekerName,
                    sk.PhoneNumber as SeekerPhone,
                    sk.Email as SeekerEmail
                FROM Bookings b
                JOIN StorageSpaces s ON b.SpaceID = s.SpaceID
                JOIN StorageSeekers sk ON b.SeekerID = sk.SeekerID
                WHERE s.ProviderID = @providerId
                ORDER BY b.CreatedAt DESC
            `);

        res.json({
            success: true,
            bookings: result.recordset
        });

    } catch (err) {
        console.error('Bookings fetch error:', err);
        res.status(500).json({ error: 'Server error fetching bookings' });
    }
});

// =============================================
// NOTIFICATION ENDPOINTS
// =============================================

// Get user notifications
app.get('/api/notifications/:userType/:userId', async (req, res) => {
    try {
        const { userType, userId } = req.params;
        const pool = await poolPromise;

        let query;
        if (userType === 'seeker') {
            query = `
                SELECT 
                    NotificationID,
                    NotificationType,
                    Title,
                    Message,
                    IsRead,
                    Priority,
                    CreatedAt
                FROM Notifications
                WHERE SeekerID = @userId
                ORDER BY CreatedAt DESC
            `;
        } else {
            query = `
                SELECT 
                    NotificationID,
                    NotificationType,
                    Title,
                    Message,
                    IsRead,
                    Priority,
                    CreatedAt
                FROM Notifications
                WHERE ProviderID = @userId
                ORDER BY CreatedAt DESC
            `;
        }

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(query);

        res.json({
            success: true,
            notifications: result.recordset
        });

    } catch (err) {
        console.error('Notifications fetch error:', err);
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
});

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// =============================================
// SERVER INITIALIZATION
// =============================================

const startServer = async () => {
    try {
        await initializeDB();
        app.listen(PORT, () => {
            console.log(`Si'aa API Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await sql.close();
    process.exit(0);
});

startServer();
