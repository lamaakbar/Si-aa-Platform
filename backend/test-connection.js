// test-connection.js - Test SQL Server Connection
require('dotenv').config();
const sql = require('mssql');

console.log('='.repeat(50));
console.log('SQL Server Connection Test');
console.log('='.repeat(50));
console.log('');

// Display configuration (hide password)
console.log('Configuration:');
console.log('  Server:', process.env.DB_SERVER || 'localhost');
console.log('  Database:', process.env.DB_NAME || 'Siaa');
console.log('  User:', process.env.DB_USER || 'not set');
console.log('  Password:', process.env.DB_PASSWORD ? '***' : 'not set');
console.log('');

const config = {
    user: process.env.DB_USER || 'Lama1292',
    password: process.env.DB_PASSWORD || 'Lama123!!',
    server: process.env.DB_SERVER || 'siaa.database.windows.net',
    database: process.env.DB_NAME || 'Siaa',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

console.log('Attempting to connect...');
console.log('');

sql.connect(config)
    .then(pool => {
        console.log('✅ SUCCESS! Connected to SQL Server');
        console.log('');
        
        // Test query
        console.log('Testing database query...');
        return pool.request().query('SELECT @@VERSION as version, DB_NAME() as current_db, GETDATE() as server_time');
    })
    .then(result => {
        console.log('✅ Query successful!');
        console.log('');
        console.log('Database:', result.recordset[0].current_db);
        console.log('Server Time:', result.recordset[0].server_time);
        console.log('');
        console.log('SQL Server Version:');
        console.log(result.recordset[0].version.substring(0, 100) + '...');
        console.log('');
        
        // Test if our tables exist
        return sql.query('SELECT COUNT(*) as seeker_count FROM StorageSeekers');
    })
    .then(result => {
        console.log('✅ Database tables accessible!');
        console.log('   StorageSeekers count:', result.recordset[0].seeker_count);
        console.log('');
        console.log('='.repeat(50));
        console.log('🎉 ALL TESTS PASSED!');
        console.log('Your database connection is working correctly.');
        console.log('You can now run: npm start');
        console.log('='.repeat(50));
        sql.close();
        process.exit(0);
    })
    .catch(err => {
        console.log('❌ CONNECTION FAILED');
        console.log('');
        console.log('Error:', err.message);
        console.log('');
        console.log('='.repeat(50));
        console.log('Troubleshooting Steps:');
        console.log('='.repeat(50));
        
        if (err.message.includes('Failed to connect')) {
            console.log('');
            console.log('1. Check if SQL Server is running:');
            console.log('   - Open Services (services.msc)');
            console.log('   - Find SQL Server (SQLEXPRESS or MSSQLSERVER)');
            console.log('   - Status should be "Running"');
            console.log('');
            console.log('2. Try changing DB_SERVER in .env to:');
            console.log('   DB_SERVER=localhost\\\\SQLEXPRESS');
            console.log('   (use double backslash)');
            console.log('');
            console.log('3. Enable TCP/IP:');
            console.log('   - Open SQL Server Configuration Manager');
            console.log('   - Protocols for SQLEXPRESS → TCP/IP');
            console.log('   - Set Enabled = Yes');
            console.log('   - Set TCP Port = 1433 in IP Addresses tab');
            console.log('   - Restart SQL Server');
        } else if (err.message.includes('Login failed')) {
            console.log('');
            console.log('1. Verify credentials:');
            console.log('   - Try connecting with SSMS first');
            console.log('   - Use the same credentials as in .env');
            console.log('');
            console.log('2. Enable SQL Server Authentication:');
            console.log('   - SSMS → Server Properties → Security');
            console.log('   - Select "SQL Server and Windows Authentication"');
            console.log('   - Restart SQL Server');
        } else if (err.message.includes('Cannot open database')) {
            console.log('');
            console.log('1. Create the database:');
            console.log('   CREATE DATABASE SiaaDB;');
            console.log('');
            console.log('2. Run your schema SQL file');
            console.log('3. Run siaa_dummy_data.sql');
        }
        
        console.log('');
        console.log('For detailed help, see: SQL_CONNECTION_FIX.md');
        console.log('');
        process.exit(1);
    });