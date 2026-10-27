import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';

@Controller()
export class DashboardController {
  @Get()
  @ApiExcludeEndpoint()
  getDashboard(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Processing Platform | Event-Driven Microservices</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0d14;
      --bg-secondary: #111622;
      --bg-card: rgba(22, 28, 44, 0.7);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(99, 102, 241, 0.3);
      --accent-primary: #6366f1;
      --accent-secondary: #8b5cf6;
      --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.12) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.08) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(139, 92, 246, 0.05) 0px, transparent 50%);
    }

    header {
      border-bottom: 1px solid var(--border-color);
      background: rgba(10, 13, 20, 0.85);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
      color: inherit;
    }

    .logo-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    }

    .brand-title {
      font-weight: 800;
      font-size: 1.2rem;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .header-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1.1rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--accent-gradient);
      color: white;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }

    .btn-secondary {
      background: var(--bg-secondary);
      border-color: var(--border-color);
      color: var(--text-main);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .hero-banner {
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem 2.5rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .hero-banner::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 300px;
      height: 300px;
      background: var(--accent-gradient);
      filter: blur(100px);
      opacity: 0.15;
      pointer-events: none;
    }

    .hero-text h1 {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }
    .hero-text p {
      color: var(--text-muted);
      font-size: 0.95rem;
      max-width: 700px;
      line-height: 1.5;
    }

    .mesh-tags {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      flex-wrap: wrap;
    }
    .mesh-tag {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      color: #cbd5e1;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 2rem;
    }

    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(12px);
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Auth panel */
    .auth-box {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-group label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-control {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      color: var(--text-main);
      font-size: 0.875rem;
      font-family: inherit;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    .quick-logins {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .quick-btn {
      padding: 0.45rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .quick-btn:hover {
      background: rgba(99, 102, 241, 0.15);
      border-color: var(--accent-primary);
      color: var(--text-main);
    }

    /* Products grid */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
    }
    .product-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
    }
    .product-card:hover {
      transform: translateY(-3px);
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .prod-sku {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--accent-secondary);
      background: rgba(139, 92, 246, 0.1);
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 0.5rem;
    }
    .prod-name {
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 0.75rem;
      color: #f1f5f9;
    }
    .prod-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .prod-price {
      font-weight: 800;
      font-size: 1.15rem;
      color: #38bdf8;
    }
    .prod-stock {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .prod-stock.low { color: var(--warning); font-weight: 600; }
    .prod-stock.out { color: var(--danger); font-weight: 600; }

    /* Orders Section */
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      font-size: 0.85rem;
    }
    .orders-table th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border-color);
    }
    .orders-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .order-status {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-PENDING { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .status-CONFIRMED { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-REJECTED { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .status-CANCELLED { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

    /* Terminal Console */
    .terminal-box {
      background: #05070c;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: #cbd5e1;
      height: 180px;
      overflow-y: auto;
      margin-top: 1rem;
      line-height: 1.6;
    }
    .terminal-line { margin-bottom: 0.25rem; }
    .t-time { color: var(--text-dim); margin-right: 0.5rem; }
    .t-info { color: #38bdf8; }
    .t-success { color: #34d399; }
    .t-warn { color: #fbbf24; }
    .t-error { color: #f87171; }

    /* Cart drawer */
    .cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
    }
  </style>
</head>
<body>

  <header>
    <a href="/" class="brand">
      <div class="logo-icon">⚡</div>
      <div>
        <div class="brand-title">Order Processing Platform</div>
        <div class="brand-subtitle">Event-Driven Microservices Hub</div>
      </div>
    </a>
    <div class="header-nav">
      <div class="badge">
        <span class="badge-dot"></span>
        System Healthy (3000)
      </div>
      <a href="/api/docs" target="_blank" class="btn btn-secondary">📖 Swagger API Docs</a>
      <a href="http://localhost:8080" target="_blank" class="btn btn-secondary">📊 Kafka UI (:8080)</a>
      <a href="/health" target="_blank" class="btn btn-secondary">🩺 Health Check</a>
    </div>
  </header>

  <main class="container">
    <div class="hero-banner">
      <div class="hero-text">
        <h1>Event-Driven Microservices Live Console</h1>
        <p>Explore synchronous gRPC inter-service calls, Kafka KRaft choreography, transactional outbox pattern, and PostgreSQL pessimistic write locking in real-time.</p>
        <div class="mesh-tags">
          <span class="mesh-tag">API Gateway :3000</span>
          <span class="mesh-tag">Order Service gRPC :50051</span>
          <span class="mesh-tag">Inventory Service gRPC :50052</span>
          <span class="mesh-tag">Notification Consumer</span>
          <span class="mesh-tag">Kafka KRaft :9092</span>
          <span class="mesh-tag">PostgreSQL (4 DBs)</span>
        </div>
      </div>
      <div>
        <button class="btn btn-primary" onclick="refreshCatalog()">🔄 Refresh Catalog</button>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Left Column: User Authentication & Shopping Cart -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Auth Card -->
        <div class="card">
          <div class="card-title">
            <span>👤 Authentication</span>
            <span id="userRoleBadge" class="badge" style="display: none;">USER</span>
          </div>

          <div id="authLoggedOut" class="auth-box">
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="authEmail" class="form-control" value="user@example.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="authPassword" class="form-control" value="UserPass123!">
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn btn-primary" style="flex: 1;" onclick="handleLogin()">Login</button>
              <button class="btn btn-secondary" onclick="handleRegister()">Register</button>
            </div>
            <div class="quick-logins">
              <button class="quick-btn" onclick="fillAuth('user@example.com', 'UserPass123!', 'USER')">Use Customer</button>
              <button class="quick-btn" onclick="fillAuth('admin@example.com', 'AdminPass123!', 'ADMIN')">Use Admin</button>
            </div>
          </div>

          <div id="authLoggedIn" style="display: none;" class="auth-box">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Logged in as:</div>
            <div id="loggedInEmail" style="font-weight: 700; color: #38bdf8;"></div>
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-dim);" id="loggedInId"></div>
            <button class="btn btn-secondary" style="margin-top: 0.5rem;" onclick="handleLogout()">Logout</button>
          </div>
        </div>

        <!-- Cart Card -->
        <div class="card">
          <div class="card-title">
            <span>🛒 Active Cart (<span id="cartCount">0</span>)</span>
            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="clearCart()">Clear</button>
          </div>
          <div id="cartItemsList" style="min-height: 80px;">
            <div style="color: var(--text-dim); font-size: 0.85rem; text-align: center; padding: 1.5rem 0;">Cart is empty</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
            <div style="font-weight: 600; color: var(--text-muted); font-size: 0.85rem;">Estimated Total</div>
            <div id="cartTotal" style="font-weight: 800; font-size: 1.2rem; color: #38bdf8;">$0.00</div>
          </div>
          <button id="btnCheckout" class="btn btn-primary" style="width: 100%; margin-top: 1rem; justify-content: center;" onclick="placeOrder()">
            Place Order (Saga)
          </button>
        </div>

        <!-- Terminal Log -->
        <div class="card">
          <div class="card-title">
            <span>📡 Live Activity Log</span>
            <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="clearLogs()">Clear</button>
          </div>
          <div id="terminal" class="terminal-box"></div>
        </div>

      </div>

      <!-- Right Column: Product Catalog & Live Orders -->
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        
        <!-- Products Section -->
        <div class="card">
          <div class="card-title">
            <span>📦 Product Catalog (gRPC InventoryService)</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">Pessimistic Row Locking Enabled</span>
          </div>
          <div id="productsGrid" class="products-grid">
            <div style="color: var(--text-dim); padding: 2rem;">Loading products from Inventory Service...</div>
          </div>
        </div>

        <!-- Orders Section -->
        <div class="card">
          <div class="card-title">
            <span>📜 Live Orders & Saga Tracker</span>
            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="loadOrders()">Refresh Orders</button>
          </div>
          <div style="overflow-x: auto;">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="ordersTableBody">
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">Log in to view your orders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  </main>

  <script>
    let authToken = localStorage.getItem('opp_token') || '';
    let currentUser = JSON.parse(localStorage.getItem('opp_user') || 'null');
    let cart = [];
    let productsCache = [];

    function log(message, type = 'info') {
      const term = document.getElementById('terminal');
      const time = new Date().toLocaleTimeString();
      const line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML = '<span class="t-time">[' + time + ']</span> <span class="t-' + type + '">' + message + '</span>';
      term.appendChild(line);
      term.scrollTop = term.scrollHeight;
    }

    function updateAuthUI() {
      if (authToken && currentUser) {
        document.getElementById('authLoggedOut').style.display = 'none';
        document.getElementById('authLoggedIn').style.display = 'flex';
        document.getElementById('loggedInEmail').innerText = currentUser.email;
        document.getElementById('loggedInId').innerText = 'ID: ' + currentUser.id;
        const badge = document.getElementById('userRoleBadge');
        badge.style.display = 'inline-flex';
        badge.innerText = currentUser.role || 'USER';
        loadOrders();
      } else {
        document.getElementById('authLoggedOut').style.display = 'flex';
        document.getElementById('authLoggedIn').style.display = 'none';
        document.getElementById('userRoleBadge').style.display = 'none';
        document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">Log in to view your orders</td></tr>';
      }
    }

    function fillAuth(email, pass, role) {
      document.getElementById('authEmail').value = email;
      document.getElementById('authPassword').value = pass;
    }

    async function handleLogin() {
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      try {
        log('Authenticating ' + email + '...', 'info');
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        
        authToken = data.accessToken;
        currentUser = data.user;
        localStorage.setItem('opp_token', authToken);
        localStorage.setItem('opp_user', JSON.stringify(currentUser));
        log('Login successful! JWT acquired.', 'success');
        updateAuthUI();
      } catch (err) {
        log('Login Error: ' + err.message, 'error');
      }
    }

    async function handleRegister() {
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;
      try {
        log('Registering account for ' + email + '...', 'info');
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        log('Registration complete! You can now log in.', 'success');
        await handleLogin();
      } catch (err) {
        log('Registration Error: ' + err.message, 'error');
      }
    }

    function handleLogout() {
      authToken = '';
      currentUser = null;
      localStorage.removeItem('opp_token');
      localStorage.removeItem('opp_user');
      log('User logged out.', 'info');
      updateAuthUI();
    }

    async function refreshCatalog() {
      log('Querying Inventory gRPC service via API Gateway...', 'info');
      try {
        const res = await fetch('/products?limit=50');
        const data = await res.json();
        productsCache = data.products || [];
        renderProducts();
        log('Loaded ' + productsCache.length + ' products from catalog.', 'success');
      } catch (err) {
        log('Failed to fetch products: ' + err.message, 'error');
        document.getElementById('productsGrid').innerHTML = '<div style="color: var(--danger); padding: 1rem;">Failed to load catalog. Make sure microservices are running.</div>';
      }
    }

    function renderProducts() {
      const grid = document.getElementById('productsGrid');
      if (productsCache.length === 0) {
        grid.innerHTML = '<div style="color: var(--text-dim); padding: 2rem;">No products found in catalog. Run npm run seed to populate products!</div>';
        return;
      }

      grid.innerHTML = productsCache.map(p => {
        const stockClass = p.stockQuantity === 0 ? 'out' : (p.stockQuantity <= 5 ? 'low' : '');
        const stockText = p.stockQuantity === 0 ? 'Out of Stock' : (p.stockQuantity + ' in stock');
        return '<div class="product-card">' +
          '<div>' +
            '<span class="prod-sku">' + p.sku + '</span>' +
            '<div class="prod-name">' + p.name + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="prod-bottom">' +
              '<div class="prod-price">$' + Number(p.price).toFixed(2) + '</div>' +
              '<div class="prod-stock ' + stockClass + '">' + stockText + '</div>' +
            '</div>' +
            '<button class="btn btn-primary" style="width: 100%; margin-top: 0.85rem; justify-content: center; font-size: 0.8rem;" ' +
              (p.stockQuantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '') +
              ' onclick="addToCart(\\'' + p.id + '\\')">' +
              (p.stockQuantity === 0 ? 'Sold Out' : '+ Add to Order') +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function addToCart(productId) {
      const product = productsCache.find(p => p.id === productId);
      if (!product) return;

      const existing = cart.find(i => i.productId === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1
        });
      }
      renderCart();
      log('Added ' + product.name + ' to cart', 'info');
    }

    function clearCart() {
      cart = [];
      renderCart();
    }

    function renderCart() {
      document.getElementById('cartCount').innerText = cart.reduce((acc, i) => acc + i.quantity, 0);
      const list = document.getElementById('cartItemsList');
      if (cart.length === 0) {
        list.innerHTML = '<div style="color: var(--text-dim); font-size: 0.85rem; text-align: center; padding: 1.5rem 0;">Cart is empty</div>';
        document.getElementById('cartTotal').innerText = '$0.00';
        return;
      }

      let total = 0;
      list.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return '<div class="cart-item">' +
          '<div>' +
            '<div style="font-weight: 600;">' + item.name + '</div>' +
            '<div style="color: var(--text-muted); font-size: 0.75rem;">Qty: ' + item.quantity + ' × $' + item.price.toFixed(2) + '</div>' +
          '</div>' +
          '<div style="font-weight: 700; color: #38bdf8;">$' + itemTotal.toFixed(2) + '</div>' +
        '</div>';
      }).join('');
      document.getElementById('cartTotal').innerText = '$' + total.toFixed(2);
    }

    async function placeOrder() {
      if (!authToken) {
        alert('Please log in first to place an order.');
        return;
      }
      if (cart.length === 0) {
        alert('Cart is empty. Add products from the catalog first.');
        return;
      }

      const payload = {
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
      };

      try {
        log('Initiating Saga: POST /orders with ' + cart.length + ' item(s)...', 'info');
        const res = await fetch('/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify(payload)
        });
        const order = await res.json();
        if (!res.ok) throw new Error(order.message || 'Order placement failed');

        log('Order ' + order.id + ' placed with status ' + order.status + '! Dispatched order.created to Kafka.', 'success');
        clearCart();
        loadOrders();
        refreshCatalog();

        // Poll order status over 5 seconds to show saga completion live
        pollOrderStatus(order.id);
      } catch (err) {
        log('Order Error: ' + err.message, 'error');
      }
    }

    function pollOrderStatus(orderId) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch('/orders/' + orderId, {
            headers: { 'Authorization': 'Bearer ' + authToken }
          });
          const o = await res.json();
          if (o.status !== 'PENDING' || attempts >= 5) {
            clearInterval(interval);
            log('Order ' + orderId + ' updated to final state: ' + o.status + '!', o.status === 'CONFIRMED' ? 'success' : 'warn');
            loadOrders();
            refreshCatalog();
          }
        } catch (e) {
          clearInterval(interval);
        }
      }, 1500);
    }

    async function cancelOrder(orderId) {
      if (!confirm('Are you sure you want to cancel order ' + orderId + '?')) return;
      try {
        log('Cancelling order ' + orderId + '...', 'info');
        const res = await fetch('/orders/' + orderId + '/cancel', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const o = await res.json();
        if (!res.ok) throw new Error(o.message || 'Cancel failed');
        log('Order cancelled. order.cancelled event published to release reserved stock.', 'success');
        loadOrders();
        setTimeout(refreshCatalog, 2000);
      } catch (err) {
        log('Cancel Error: ' + err.message, 'error');
      }
    }

    async function loadOrders() {
      if (!authToken) return;
      try {
        const res = await fetch('/orders?limit=20', {
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await res.json();
        const orders = data.orders || [];
        const tbody = document.getElementById('ordersTableBody');
        if (orders.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No orders placed yet.</td></tr>';
          return;
        }

        tbody.innerHTML = orders.map(o => {
          const canCancel = o.status === 'PENDING' || o.status === 'CONFIRMED';
          return '<tr>' +
            '<td style="font-family: var(--font-mono); font-size: 0.75rem;">' + o.id.substring(0, 8) + '...</td>' +
            '<td style="font-weight: 700;">$' + Number(o.totalAmount).toFixed(2) + '</td>' +
            '<td><span class="order-status status-' + o.status + '">' + o.status + '</span></td>' +
            '<td>' + (o.items ? o.items.length : 0) + ' items</td>' +
            '<td style="color: var(--text-muted); font-size: 0.75rem;">' + new Date(o.createdAt).toLocaleTimeString() + '</td>' +
            '<td>' +
              (canCancel ? '<button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.72rem; color: var(--danger);" onclick="cancelOrder(\\'' + o.id + '\\')">Cancel</button>' : '-') +
            '</td>' +
          '</tr>';
        }).join('');
      } catch (err) {
        log('Failed to load orders: ' + err.message, 'error');
      }
    }

    function clearLogs() {
      document.getElementById('terminal').innerHTML = '';
    }

    // Initial setup
    updateAuthUI();
    refreshCatalog();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
