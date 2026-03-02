const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = 'super_secret_edepe_key_2026';

async function test() {
    try {
        // 1. Generate a mock SysAdmin token
        const token = jwt.sign(
            { userId: 1, companyId: 1, role: 'SysAdmin' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log("Mock Token Generated:", token);

        // 2. Try to call the users POST route
        const res = await axios.post('http://localhost:3000/api/users', {
            name: 'Test',
            lastName: 'User',
            email: 'test' + Date.now() + '@example.com',
            tempPassword: 'password123',
            role: 'Usuario Normal'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("Status:", res.status);
        console.log("Response Data:", res.data);
    } catch (error) {
        console.error("Status Code:", error.response ? error.response.status : "No response");
        console.error("Error Response:", error.response ? error.response.data : error.message);
    }
}

test();
