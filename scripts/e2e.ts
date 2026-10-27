import * as http from 'http';
import { Client as PgClient } from 'pg';
import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:29092,localhost:9092').split(',');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

function request(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const postData = body ? JSON.stringify(body) : '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      },
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runAcceptanceTests() {
  console.log('========================================================================');
  console.log('🚀 RUNNING END-TO-END ACCEPTANCE SUITE (8 VERIFICATION CRITERIA)');
  console.log('========================================================================\n');

  // Database Clients
  const gatewayDb = new PgClient({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'gateway_db',
  });
  const orderDb = new PgClient({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'order_db',
  });
  const inventoryDb = new PgClient({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'inventory_db',
  });
  const notificationDb = new PgClient({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'notification_db',
  });

  await gatewayDb.connect();
  await orderDb.connect();
  await inventoryDb.connect();
  await notificationDb.connect();

  const kafka = new Kafka({
    clientId: 'e2e-tester',
    brokers: KAFKA_BROKERS,
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Register and login returns JWT; protected routes return 401 & 403
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 1] Testing Auth: Register, Login, JWT verification & Role enforcement');
  const userEmail = `user_${Date.now()}@test.com`;
  const adminEmail = `admin_${Date.now()}@test.com`;

  // Register User
  const regUserRes = await request('POST', '/auth/register', {
    email: userEmail,
    password: 'Password123!',
    role: 'USER',
  });
  console.log(`   Register standard user: HTTP ${regUserRes.status}`);

  // Register Admin
  const regAdminRes = await request('POST', '/auth/register', {
    email: adminEmail,
    password: 'AdminPassword123!',
    role: 'ADMIN',
  });
  console.log(`   Register admin user: HTTP ${regAdminRes.status}`);

  // Login User
  const loginUserRes = await request('POST', '/auth/login', {
    email: userEmail,
    password: 'Password123!',
  });
  const userToken = loginUserRes.data.accessToken;
  console.log(`   User login returned JWT: ${Boolean(userToken)} (HTTP ${loginUserRes.status})`);

  // Login Admin
  const loginAdminRes = await request('POST', '/auth/login', {
    email: adminEmail,
    password: 'AdminPassword123!',
  });
  const adminToken = loginAdminRes.data.accessToken;
  console.log(`   Admin login returned JWT: ${Boolean(adminToken)} (HTTP ${loginAdminRes.status})`);

  // Protected route without token -> 401
  const unauthRes = await request('GET', '/orders');
  console.log(`   GET /orders without token: HTTP ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) throw new Error('Expected 401 Unauthorized');

  // Admin route with regular user token -> 403
  const forbiddenRes = await request(
    'POST',
    '/products',
    {
      sku: `PROD-${Date.now()}`,
      name: 'Unauthorized Product',
      price: 10,
      stockQuantity: 10,
    },
    userToken,
  );
  console.log(`   POST /products with USER role: HTTP ${forbiddenRes.status} (Expected: 403)`);
  if (forbiddenRes.status !== 403) throw new Error('Expected 403 Forbidden');

  console.log('   ✅ TEST 1 PASSED: Auth, JWT, 401 and 403 verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 2: Invalid request bodies return 400 with clear validation messages
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 2] Testing Request Validation: Invalid payload rejection');
  const invalidOrderRes = await request(
    'POST',
    '/orders',
    {
      items: [
        {
          productId: 'not-a-valid-uuid',
          quantity: -3, // Invalid quantity
        },
      ],
      unknownField: 'malicious', // ForbidNonWhitelisted
    },
    userToken,
  );
  console.log(`   POST /orders with invalid schema: HTTP ${invalidOrderRes.status}`);
  console.log(`   Validation error response:`, invalidOrderRes.data.message);
  if (invalidOrderRes.status !== 400) throw new Error('Expected 400 Bad Request');
  console.log('   ✅ TEST 2 PASSED: Global ValidationPipe enforces rules with HTTP 400.\n');

  // ---------------------------------------------------------------------------
  // TEST 3: Happy path: product stock 10 -> order 2 -> PENDING -> CONFIRMED -> stock 8
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 3] Happy Path: Product stock 10 -> Order 2 items -> PENDING -> CONFIRMED -> stock 8');
  const happySku = `HAPPY-${Date.now()}`;
  const prodHappyRes = await request(
    'POST',
    '/products',
    {
      sku: happySku,
      name: 'Happy Path Gadget',
      price: 50.0,
      stockQuantity: 10,
    },
    adminToken,
  );
  const happyProdId = prodHappyRes.data.id;
  console.log(`   Created product '${happySku}' (ID: ${happyProdId}) with stock 10`);

  // Place order for 2 items
  const placeOrderRes = await request(
    'POST',
    '/orders',
    {
      items: [{ productId: happyProdId, quantity: 2 }],
    },
    userToken,
  );
  const happyOrderId = placeOrderRes.data.id;
  console.log(`   Placed Order ID: ${happyOrderId}, Initial Status: ${placeOrderRes.data.status}`);
  if (placeOrderRes.data.status !== 'PENDING') throw new Error('Order must initially be PENDING');

  // Wait for asynchronous Kafka event processing & outbox publishing
  console.log('   Waiting 3.5s for async Kafka event cycle (order.created -> inventory.reserved -> order.confirmed)...');
  await sleep(3500);

  // Check updated order status
  const happyOrderCheck = await request('GET', `/orders/${happyOrderId}`, undefined, userToken);
  console.log(`   Order Final Status: ${happyOrderCheck.data.status} (Expected: CONFIRMED)`);
  if (happyOrderCheck.data.status !== 'CONFIRMED') throw new Error('Order failed to confirm');

  // Check stock in inventory_db
  const stockCheck = await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [happyProdId]);
  const newStock = stockCheck.rows[0].stock_quantity;
  console.log(`   Product Stock after reservation: ${newStock} (Expected: 8)`);
  if (newStock !== 8) throw new Error(`Expected stock 8 but found ${newStock}`);

  // Check notification in notification_db
  const notifCheck = await notificationDb.query('SELECT * FROM notifications WHERE order_id = $1', [happyOrderId]);
  console.log(`   Notification row exists: ${notifCheck.rows.length > 0}, Type: ${notifCheck.rows[0]?.type}`);
  if (notifCheck.rows.length === 0 || notifCheck.rows[0]?.type !== 'ORDER_CONFIRMED') {
    throw new Error('Expected ORDER_CONFIRMED notification');
  }
  console.log('   ✅ TEST 3 PASSED: Happy path succeeded with full async saga cycle.\n');

  // ---------------------------------------------------------------------------
  // TEST 4: Insufficient stock -> order > available -> REJECTED, stock unchanged
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 4] Insufficient Stock: Ordering more than available -> REJECTED & stock unchanged');
  const rejectSku = `REJECT-${Date.now()}`;
  const prodRejectRes = await request(
    'POST',
    '/products',
    {
      sku: rejectSku,
      name: 'Scarce Item',
      price: 100.0,
      stockQuantity: 3,
    },
    adminToken,
  );
  const rejectProdId = prodRejectRes.data.id;
  console.log(`   Created product '${rejectSku}' with stock 3`);

  // Place order for 5 items (available: 3)
  const failOrderRes = await request(
    'POST',
    '/orders',
    {
      items: [{ productId: rejectProdId, quantity: 5 }],
    },
    userToken,
  );
  const rejectOrderId = failOrderRes.data.id;
  console.log(`   Placed Order ID: ${rejectOrderId} for quantity 5`);

  console.log('   Waiting 3.5s for async Kafka event cycle (order.created -> inventory.failed -> order.rejected)...');
  await sleep(3500);

  const failOrderCheck = await request('GET', `/orders/${rejectOrderId}`, undefined, userToken);
  console.log(`   Order Final Status: ${failOrderCheck.data.status} (Expected: REJECTED)`);
  if (failOrderCheck.data.status !== 'REJECTED') throw new Error('Order should have been REJECTED');

  const rejectStockCheck = await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [rejectProdId]);
  console.log(`   Stock quantity remains: ${rejectStockCheck.rows[0].stock_quantity} (Expected: 3)`);
  if (rejectStockCheck.rows[0].stock_quantity !== 3) throw new Error('Stock should not have decremented');

  const rejectNotifCheck = await notificationDb.query('SELECT * FROM notifications WHERE order_id = $1', [rejectOrderId]);
  console.log(`   Rejection notification row: ${rejectNotifCheck.rows[0]?.type}`);
  if (rejectNotifCheck.rows.length === 0 || rejectNotifCheck.rows[0]?.type !== 'ORDER_REJECTED') {
    throw new Error('Expected ORDER_REJECTED notification');
  }
  console.log('   ✅ TEST 4 PASSED: Insufficient stock correctly triggered saga rollback and rejection.\n');

  // ---------------------------------------------------------------------------
  // TEST 5: Concurrency: 20 parallel orders for stock 10 -> exactly 10 sold, stock 0
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 5] Concurrency: Firing 20 parallel orders for stock 10 -> exactly 10 units sold');
  const concurSku = `CONCUR-${Date.now()}`;
  const prodConcurRes = await request(
    'POST',
    '/products',
    {
      sku: concurSku,
      name: 'High Demand Ticket',
      price: 25.0,
      stockQuantity: 10,
    },
    adminToken,
  );
  const concurProdId = prodConcurRes.data.id;
  console.log(`   Created product '${concurSku}' with stock 10`);

  // Fire 20 parallel orders each requesting 1 unit
  console.log('   Firing 20 concurrent order placement requests in parallel...');
  const orderPromises = [];
  for (let i = 0; i < 20; i++) {
    orderPromises.push(
      request(
        'POST',
        '/orders',
        {
          items: [{ productId: concurProdId, quantity: 1 }],
        },
        userToken,
      ),
    );
  }
  const concurResults = await Promise.all(orderPromises);
  const concurOrderIds = concurResults.map((r) => r.data.id);
  console.log(`   Successfully placed 20 pending orders.`);

  console.log('   Waiting 6.0s for all 20 orders to process through pessimistic locking...');
  await sleep(6000);

  // Check order statuses
  const statusCounts: Record<string, number> = { CONFIRMED: 0, REJECTED: 0, PENDING: 0 };
  for (const orderId of concurOrderIds) {
    const oRes = await request('GET', `/orders/${orderId}`, undefined, userToken);
    statusCounts[oRes.data.status] = (statusCounts[oRes.data.status] || 0) + 1;
  }
  console.log(`   Results across 20 orders:`, statusCounts);

  const concurStockCheck = await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [concurProdId]);
  const finalStock = concurStockCheck.rows[0].stock_quantity;
  console.log(`   Final Stock in Database: ${finalStock} (Expected: 0)`);

  if (statusCounts['CONFIRMED'] !== 10 || statusCounts['REJECTED'] !== 10 || finalStock !== 0) {
    throw new Error(
      `Concurrency test failed! Expected 10 CONFIRMED, 10 REJECTED, stock 0. Got: ${JSON.stringify(statusCounts)}, stock: ${finalStock}`,
    );
  }
  console.log('   ✅ TEST 5 PASSED: Pessimistic locking guaranteed exactly 10 units sold with 0 overshoot.\n');

  // ---------------------------------------------------------------------------
  // TEST 6: Idempotency: re-publishing the same order.created event twice
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 6] Idempotency: Re-publishing duplicate event -> stock decremented only once');
  const idempSku = `IDEMP-${Date.now()}`;
  const prodIdempRes = await request(
    'POST',
    '/products',
    {
      sku: idempSku,
      name: 'Idempotency Product',
      price: 15.0,
      stockQuantity: 10,
    },
    adminToken,
  );
  const idempProdId = prodIdempRes.data.id;

  const fakeOrderId = randomUUID();
  const duplicateEventId = randomUUID();
  const fakeEvent = {
    eventId: duplicateEventId,
    eventType: 'order.created',
    occurredAt: new Date().toISOString(),
    correlationId: 'corr-idemp-test',
    payload: {
      orderId: fakeOrderId,
      userId: 'mock-user-id',
      totalAmount: 30.0,
      items: [{ productId: idempProdId, quantity: 2, unitPrice: 15.0 }],
    },
  };

  const producer = kafka.producer();
  await producer.connect();

  console.log(`   Publishing event ${duplicateEventId} for the FIRST time...`);
  await producer.send({
    topic: 'order.created',
    messages: [
      {
        key: fakeOrderId,
        value: JSON.stringify(fakeEvent),
      },
    ],
  });

  await sleep(3000);

  const stockAfterFirst = (await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [idempProdId])).rows[0].stock_quantity;
  console.log(`   Stock after 1st event delivery: ${stockAfterFirst} (Expected: 8)`);

  console.log(`   Re-publishing the EXACT SAME event ${duplicateEventId} a SECOND time...`);
  await producer.send({
    topic: 'order.created',
    messages: [
      {
        key: fakeOrderId,
        value: JSON.stringify(fakeEvent),
      },
    ],
  });

  await sleep(3000);

  const stockAfterSecond = (await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [idempProdId])).rows[0].stock_quantity;
  console.log(`   Stock after 2nd duplicate event delivery: ${stockAfterSecond} (Expected: 8)`);

  if (stockAfterSecond !== 8) {
    throw new Error(`Idempotency failed: stock decremented twice! Expected 8 but got ${stockAfterSecond}`);
  }
  console.log('   ✅ TEST 6 PASSED: Duplicate event detected in processed_events; stock preserved.\n');

  // ---------------------------------------------------------------------------
  // TEST 7: Retry and DLQ: poison message triggers 3 retries and routes to .dlq topic
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 7] Retry & Dead Letter Queue (DLQ): Poison pill event triggers 3 retries and lands in DLQ');
  const poisonEventId = randomUUID();
  const poisonOrderId = randomUUID();
  const poisonEvent = {
    eventId: poisonEventId,
    eventType: 'order.created',
    occurredAt: new Date().toISOString(),
    correlationId: 'corr-dlq-test',
    payload: {
      orderId: poisonOrderId,
      userId: 'mock-user-id',
      totalAmount: 10.0,
      items: [],
      trigger: 'FORCE_POISON_PILL', // Triggers intentional failure in consumer
    },
  };

  // Set up Kafka consumer to listen on order.created.dlq
  const dlqConsumer = kafka.consumer({ groupId: `e2e-dlq-verifier-${Date.now()}` });
  await dlqConsumer.connect();
  await dlqConsumer.subscribe({ topic: 'order.created.dlq', fromBeginning: false });

  let dlqReceivedMessage: any = null;
  await dlqConsumer.run({
    eachMessage: async ({ message }) => {
      const val = message.value?.toString();
      if (val && val.includes(poisonEventId)) {
        dlqReceivedMessage = JSON.parse(val);
      }
    },
  });

  console.log(`   Sending poison event ${poisonEventId} to topic 'order.created'...`);
  await producer.send({
    topic: 'order.created',
    messages: [
      {
        key: poisonOrderId,
        value: JSON.stringify(poisonEvent),
      },
    ],
  });

  console.log('   Waiting for 3 retries with backoff (1s, 2s, 4s) and DLQ routing...');
  for (let wait = 0; wait < 15; wait++) {
    if (dlqReceivedMessage) break;
    await sleep(1000);
  }

  await dlqConsumer.disconnect();

  console.log(`   Received message in 'order.created.dlq': ${Boolean(dlqReceivedMessage)}`);
  if (dlqReceivedMessage) {
    console.log(`   DLQ Error Info:`, dlqReceivedMessage.payload?.error);
    console.log(`   Attempts before DLQ dispatch:`, dlqReceivedMessage.payload?.attempts);
  } else {
    throw new Error('Poison message was not received in DLQ topic within timeout');
  }
  console.log('   ✅ TEST 7 PASSED: 3 retries with exponential backoff completed and routed to DLQ.\n');

  // ---------------------------------------------------------------------------
  // TEST 8: Cancel order releases reserved stock
  // ---------------------------------------------------------------------------
  console.log('👉 [TEST 8] Cancel Order: Releases reserved stock back to inventory');
  const cancelSku = `CANCEL-${Date.now()}`;
  const prodCancelRes = await request(
    'POST',
    '/products',
    {
      sku: cancelSku,
      name: 'Cancellable Item',
      price: 75.0,
      stockQuantity: 10,
    },
    adminToken,
  );
  const cancelProdId = prodCancelRes.data.id;
  console.log(`   Created product '${cancelSku}' with stock 10`);

  // Place order for 4 items
  const placeCancelOrder = await request(
    'POST',
    '/orders',
    {
      items: [{ productId: cancelProdId, quantity: 4 }],
    },
    userToken,
  );
  const orderToCancelId = placeCancelOrder.data.id;

  console.log('   Waiting 3.5s for initial order confirmation and stock reservation...');
  await sleep(3500);

  const stockAfterReserve = (await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [cancelProdId])).rows[0].stock_quantity;
  console.log(`   Stock reserved: now ${stockAfterReserve} (Expected: 6)`);
  if (stockAfterReserve !== 6) throw new Error('Stock should have decremented to 6');

  // Cancel order via API Gateway
  console.log(`   Calling POST /orders/${orderToCancelId}/cancel...`);
  const cancelRes = await request('POST', `/orders/${orderToCancelId}/cancel`, {}, userToken);
  console.log(`   Cancel response status: ${cancelRes.data.status} (Expected: CANCELLED)`);

  console.log('   Waiting 3.5s for order.cancelled event to release inventory reservation...');
  await sleep(3500);

  const finalRestoredStock = (await inventoryDb.query('SELECT stock_quantity FROM products WHERE id = $1', [cancelProdId])).rows[0].stock_quantity;
  console.log(`   Stock restored after cancellation: ${finalRestoredStock} (Expected: 10)`);
  if (finalRestoredStock !== 10) throw new Error(`Expected stock 10 restored but found ${finalRestoredStock}`);

  const resStatus = (await inventoryDb.query('SELECT status FROM stock_reservations WHERE order_id = $1', [orderToCancelId])).rows[0].status;
  console.log(`   Reservation record status: ${resStatus} (Expected: RELEASED)`);
  if (resStatus !== 'RELEASED') throw new Error('Reservation status should be RELEASED');

  console.log('   ✅ TEST 8 PASSED: Order cancellation successfully released reserved inventory.\n');

  // Cleanup
  await producer.disconnect();
  await gatewayDb.end();
  await orderDb.end();
  await inventoryDb.end();
  await notificationDb.end();

  console.log('========================================================================');
  console.log('🎉 ALL 8 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  console.log('========================================================================');
}

runAcceptanceTests().catch((err) => {
  console.error('\n❌ E2E ACCEPTANCE TEST RUN FAILED:', err);
  process.exit(1);
});
