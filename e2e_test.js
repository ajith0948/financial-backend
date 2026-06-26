const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
    try {
        // 1. Register
        console.log('1. Registering...');
        await axios.post('http://localhost:3000/api/auth/register', {
            email: 'newuser123@test.com',
            password: 'Password123'
        });
        
        // 2. Connect to DB to get OTP
        console.log('2. Fetching OTP...');
        await mongoose.connect('mongodb+srv://admin:AKASH%4020062k@cluster0.7922wv8.mongodb.net/?appName=Cluster0');
        const db = mongoose.connection;
        const user = await db.collection('users').findOne({ email: 'newuser123@test.com' });
        const otp = user.resetCode;
        console.log('OTP is:', otp);
        
        // 3. Verify OTP
        console.log('3. Verifying OTP...');
        await axios.post('http://localhost:3000/api/auth/verify-otp', {
            email: 'newuser123@test.com',
            otp: otp
        });
        
        // 4. Login
        console.log('4. Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'newuser123@test.com',
            password: 'Password123'
        });
        const token = loginRes.data.token;
        console.log('Token:', token);
        
        // 5. Fetch dashboard data
        console.log('5. Fetching statements...');
        const statementsRes = await axios.get('http://localhost:3000/api/statements', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Statements length:', statementsRes.data.length);
        
        console.log('ALL TESTS PASSED!');
        process.exit(0);
    } catch (e) {
        console.error('ERROR:', e.response ? e.response.data : e.message);
        process.exit(1);
    }
}

test();
