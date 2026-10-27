import * as http from 'http';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

function postRequest(path: string, body: any, token?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const data = JSON.stringify(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data).toString(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method: 'POST',
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              resolve({ error: true, status: res.statusCode, body: parsed });
            }
          } catch {
            resolve({ error: true, status: res.statusCode, raw: resData });
          }
        });
      },
    );

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

async function runSeed() {
  console.log('🌱 Starting Platform Seeding...');

  // 1. Create Admin User
  console.log('\n1. Creating Admin User (admin@example.com)...');
  const adminReg = await postRequest('/auth/register', {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    role: 'ADMIN',
  });
  console.log('   Admin Registration Response:', adminReg);

  // 2. Login as Admin
  console.log('\n2. Logging in as Admin to obtain JWT...');
  const adminLogin = await postRequest('/auth/login', {
    email: 'admin@example.com',
    password: 'AdminPass123!',
  });
  const adminToken = adminLogin.accessToken;
  if (!adminToken) {
    throw new Error('Failed to obtain Admin JWT token');
  }
  console.log('   Admin JWT acquired successfully!');

  // 3. Create Regular User
  console.log('\n3. Creating Regular User (user@example.com)...');
  const userReg = await postRequest('/auth/register', {
    email: 'user@example.com',
    password: 'UserPass123!',
    role: 'USER',
  });
  console.log('   User Registration Response:', userReg);

  // 4. Seed Initial Products
  const products = [
    {
      sku: 'LAPTOP-PRO-16',
      name: 'UltraBook Pro 16-inch',
      price: 1299.99,
      stockQuantity: 50,
    },
    {
      sku: 'MOUSE-MX-001',
      name: 'Wireless Ergonomic Mouse',
      price: 49.99,
      stockQuantity: 100,
    },
    {
      sku: 'KEYB-MECH-RGB',
      name: 'Custom Mechanical Keyboard',
      price: 89.99,
      stockQuantity: 30,
    },
    {
      sku: 'HEADSET-HI-RES',
      name: 'Studio Quality Wireless Headset',
      price: 199.99,
      stockQuantity: 10,
    },
  ];

  console.log('\n4. Seeding Initial Products via Admin Token...');
  for (const prod of products) {
    const res = await postRequest('/products', prod, adminToken);
    console.log(`   Created Product [${prod.sku}] -> ID: ${res.id}, Stock: ${res.stockQuantity}`);
  }

  console.log('\n✅ Seeding complete! Platform is ready for orders.');
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
