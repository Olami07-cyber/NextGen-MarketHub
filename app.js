/* All permanent marketplace data comes from the Express API. */
let user = null, stores = [], products = [], detail = null, cart = null;
const $ = s => document.querySelector(s);
const go = p => { location.hash = p; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(n));

async function api(url, opt = {}) {
  let r = await fetch(url, {
    credentials: 'include',
    headers: { ...(opt.body && !(opt.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...opt.headers },
    ...opt
  });
  let x = r.status === 204 ? null : await r.json().catch(() => ({}));
  if (!r.ok) throw Error(x?.error || 'Request failed.');
  return x;
}

function toast(x) {
  let e = $('#toast');
  if (!e) return;
  e.innerHTML = x;
  e.classList.add('show');
  setTimeout(() => e.classList.remove('show'), 3000);
}

function authModal(msg = 'To add items to your cart and start shopping, please join MarketHub or log in.') {
  $('#auth-modal')?.remove();
  let m = document.createElement('div');
  m.id = 'auth-modal';
  m.className = 'modal-backdrop';
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-icon">🛍️</div>
    <h2 id="modal-title">Join MarketHub or Log In</h2>
    <p>${esc(msg)}</p>
    <div class="modal-actions">
      <a class="btn" href="#/register" data-modal-close>Join MarketHub</a>
      <a class="btn outline" href="#/login" data-modal-close>Log in</a>
      <button class="btn light" data-modal-close>Continue browsing</button>
    </div>
  </div>`;
  document.body.appendChild(m);
}

function badge(x) {
  return `<span class="badge ${String(x).toLowerCase()}">${x}</span>`;
}

function empty(x) {
  return `<div class="empty">
    <div class="empty-icon">🍃</div>
    <h3>No Items Found</h3>
    <p>${x}</p>
  </div>`;
}

function nav() {
  const isLanding = !user && (!location.hash || location.hash === '#/' || location.hash === '#');
  const navClass = isLanding ? 'nav nav-landing' : 'nav';

  let links = '';
  let actions = '';

  if (user) {
    if (user.role === 'ADMIN') {
      links = `<a href="#/admin">Dashboard</a><a href="#/admin/sellers">Sellers</a><a href="#/admin/stores">Stores</a><a href="#/admin/products">Products</a><a href="#/admin/orders">Orders</a>`;
    } else if (user.role === 'SELLER') {
      links = `<a href="#/seller">Dashboard</a><a href="#/seller/store">My Store</a><a href="#/seller/products">Products</a><a href="#/seller/orders">Orders</a>`;
    } else {
      links = `<a href="#/stores">Stores</a><a href="#/products">Products</a><a href="#/orders">My Orders</a>`;
    }

    actions = `${user.role === 'BUYER' ? `<a class="btn light" href="#/cart">Cart</a>` : ''}
      <a class="btn outline" href="#/account">${esc(user.name.split(' ')[0])}</a>
      <button class="btn" data-a="logout">Log out</button>`;
  } else if (!isLanding) {
    actions = `<a class="btn light" href="#/login">Log in</a><a class="btn" href="#/register">Join</a>`;
  }

  // FIX #1 — hamburger button for mobile nav
  return `<nav class="${navClass}">
    <a class="brand" href="#/">
      <img src="logo.png" alt="NextGen MarketHub logo">
      NextGen <i>MarketHub</i>
    </a>
    <button class="hamburger" aria-label="Toggle navigation" aria-expanded="false" data-a="hamburger">
      <span></span><span></span><span></span>
    </button>
    <div class="navlinks" id="mobile-nav">${links}</div>
    <div class="actions desktop-actions">${actions}</div>
  </nav>`;
}

function page(x) {
  $('#app').innerHTML = `<div class="shell">${nav()}${x}<footer class="footer">© 2026 NextGen MarketHub · Nigeria's local marketplace</footer></div>`;
}

function img(x, d, alt = 'MarketHub image') {
  return x?.startsWith('/') ? `<img src="${x}" alt="${esc(alt)}" style="height:100%;width:100%;object-fit:cover">` : (x || d);
}

function pc(p) {
  return `<article class="card">
    <div class="product-img-box">
      <div class="product-img">${img(p.imageUrl, '📦')}</div>
      ${p.category ? `<span class="category-badge">${esc(p.category)}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="store-name">${esc(p.store?.name || 'Local Store')}</span>
      </div>
      <h3 class="product-title">${esc(p.name)}</h3>
      <div class="card-row">
        <b class="price">${money(p.price)}</b>
        <a class="btn small" href="#/products/${p.id}">View Details</a>
      </div>
    </div>
  </article>`;
}

function sc(s) {
  return `<article class="vintage-card">
    <div class="vintage-store-img">
      ${img(s.imageUrl, '🏛️', s.name)}
      <span class="vintage-badge">Verified Merchant</span>
    </div>
    <div class="vintage-body">
      <div class="vintage-rating">✓ Verified Local Merchant</div>
      <h3>${esc(s.name)}</h3>
      <p class="loc">📍 ${esc(s.city)}, ${esc(s.state)}</p>
      <p class="desc">${esc(s.description)}</p>
      <div class="vintage-footer">
        <span class="muted" style="font-size:12px">${s.products?.length || 'Curated'} items</span>
        <a class="btn small vintage-btn" href="#/stores/${s.id}">Enter Store →</a>
      </div>
    </div>
  </article>`;
}

async function pub(q = '') {
  [stores, products] = await Promise.all([
    api('/api/stores?q=' + encodeURIComponent(q)),
    api('/api/products?q=' + encodeURIComponent(q))
  ]);
}

async function home() {
  if (!user) {
    // Guest Landing Page: Rich green background, big logo with rhyming backdrop, CTAs, no store grid
    page(`<main class="landing-wrap">
      <div class="landing-hero">
        <img class="landing-logo" src="logo.png" alt="NextGen MarketHub logo">
        <span class="landing-eyebrow">Nigeria’s local marketplace</span>
        <h1>NextGen <em>MarketHub</em></h1>
        <p class="landing-lead">Find good things, close to home. Connect directly with trusted neighbourhood stores, quality products, and local commerce close to you.</p>
        <div class="landing-cta">
          <a class="btn big" href="#/login">Log in</a>
          <a class="btn big outline" href="#/register">Join MarketHub</a>
        </div>
        <div class="landing-pillars">
          <div class="landing-pillar">
            <span class="landing-pillar-icon">🏪</span>
            <h4>Verified Local Stores</h4>
            <p>Shop with confidence from verified local merchants and vintage boutiques in your city.</p>
          </div>
          <div class="landing-pillar">
            <span class="landing-pillar-icon">🛡️</span>
            <h4>Safe & Secure Orders</h4>
            <p>Reliable order confirmations, seller communication, and direct checkout.</p>
          </div>
          <div class="landing-pillar">
            <span class="landing-pillar-icon">⚡</span>
            <h4>Neighbourhood Speed</h4>
            <p>Enjoy quick order fulfillment and local support close to where you live.</p>
          </div>
        </div>
      </div>
    </main>`);
    return;
  }

  // Authenticated Member Home Page
  await pub();
  page(`<main class="member-home">
    <div class="member-hero">
      <div>
        <span class="eyebrow" style="color:#8ee0a9">Member Marketplace</span>
        <h1>Welcome back, <em>${esc(user.name.split(' ')[0])}</em>!</h1>
        <p>Explore curated vintage online stores, neighbourhood artisans, and fresh local goods.</p>
        <div class="member-actions">
          ${user.role === 'BUYER' ? `
            <a class="btn" href="#/stores">Browse All Stores</a>
            <a class="btn light" href="#/cart">View Cart</a>
            <a class="btn outline" href="#/orders">My Orders</a>
          ` : `
            <a class="btn" href="#/seller">Seller Dashboard</a>
            <a class="btn light" href="#/seller/add">+ Add Product</a>
            <a class="btn outline" href="#/seller/orders">Store Orders</a>
          `}
        </div>
      </div>
      <div class="member-stats-box">
        <div class="member-stat-item">
          <small>Verified Stores</small>
          <b>${stores.length}</b>
        </div>
        <div class="member-stat-item">
          <small>Available Goods</small>
          <b>${products.length}</b>
        </div>
        <div class="member-stat-item">
          <small>Your Role</small>
          <b>${badge(user.role)}</b>
        </div>
        <div class="member-stat-item">
          <small>Account Standing</small>
          <b>${badge(user.status)}</b>
        </div>
      </div>
    </div>

    <div class="section-head">
      <div>
        <span class="eyebrow">Curated Collections</span>
        <h2>Featured Vintage & Local Stores</h2>
        <p>Discover handpicked online boutiques and trusted local shops.</p>
      </div>
      <a class="text-link" href="#/stores">Explore all stores →</a>
    </div>
    <div class="grid stores" style="margin-bottom:50px">
      ${stores.map(sc).join('') || empty('No stores listed currently.')}
    </div>

    <div class="section-head">
      <div>
        <span class="eyebrow">Top Listings</span>
        <h2>Trending Marketplace Products</h2>
        <p>Quality finds from verified sellers in Nigeria.</p>
      </div>
      <a class="text-link" href="#/products">Explore all products →</a>
    </div>
    <div class="grid products">
      ${products.map(pc).join('') || empty('No products available currently.')}
    </div>
  </main>`);
}

async function list(k) {
  let q = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
  await pub(q);
  let a = k === 'stores' ? stores : products;
  page(`<main class="page">
    <div class="section-head">
      <div>
        <span class="eyebrow">Marketplace Directory</span>
        <h1 class="page-title">${k === 'stores' ? 'Explore Local & Vintage Stores' : 'Browse Quality Products'}</h1>
        <p class="muted">${k === 'stores' ? 'Connect with trusted local retailers and curated boutique shops.' : 'Discover authentic products verified by local merchants.'}</p>
      </div>
    </div>
    <form class="filterbar" data-f="${k}">
      <input class="input" name="q" value="${esc(q)}" placeholder="Search by name, location, or keyword...">
      <button class="btn">Search</button>
    </form>
    <div class="grid ${k}">
      ${a.map(k === 'stores' ? sc : pc).join('') || empty('No results found for your search.')}
    </div>
  </main>`);
}

async function show(k, id) {
  detail = await api(`/api/${k}/${id}`);
  if (k === 'stores') {
    page(`<main class="page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">Home</a> &rsaquo;
        <a href="#/stores">Stores</a> &rsaquo;
        <span aria-current="page">${esc(detail.name)}</span>
      </nav>
      <div class="vintage-store-hero">
        <div class="vintage-store-icon">${img(detail.imageUrl, '🏛️', detail.name)}</div>
        <div>
          <div class="vintage-store-tags">
            <span class="vintage-store-tag">Est. 2024</span>
            <span class="vintage-store-tag">✓ Verified Merchant</span>
            <span class="vintage-store-tag">📍 ${esc(detail.city)}, ${esc(detail.state)}</span>
          </div>
          <h1>${esc(detail.name)}</h1>
          <p class="story">${esc(detail.description)}</p>
          <p style="margin:0;font-size:13.5px;color:#d8c6b2">
            Address: <b>${esc(detail.address)}</b> · Phone: <b>${esc(detail.phone)}</b>
          </p>
        </div>
      </div>
      <div class="section-head">
        <div>
          <span class="eyebrow">Curated Collection</span>
          <h2>Store Catalog</h2>
          <p>Explore exclusive pieces and items from this merchant.</p>
        </div>
        <span class="muted">${detail.products.length} product(s)</span>
      </div>
      <div class="grid products">
        ${detail.products.map(pc).join('') || empty('No products available at this store currently.')}
      </div>
    </main>`);
  } else {
    page(`<main class="page">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#/">Home</a> &rsaquo;
        <a href="#/products">Products</a> &rsaquo;
        <a href="#/stores/${detail.store.id}">${esc(detail.store.name)}</a> &rsaquo;
        <span aria-current="page">${esc(detail.name)}</span>
      </nav>
      <div class="detail">
        <div class="detail-image">${img(detail.imageUrl, '📦', detail.name)}</div>
        <div>
          <p class="eyebrow">${esc(detail.store.name)}</p>
          <h1>${esc(detail.name)}</h1>
          <b class="price">${money(detail.price)}</b>
          <p>${esc(detail.description)}</p>
          <p style="color:var(--muted)">Stock: <b>${detail.quantity} units available</b></p>
          <div style="display:flex;gap:10px;align-items:center;margin-top:16px">
            <input class="input" data-qty="detail" type="number" min="1" max="${detail.quantity}" value="1" style="max-width:90px" aria-label="Quantity for ${esc(detail.name)}">
            <button class="btn" data-a="cart" data-id="${detail.id}">Add to cart</button>
          </div>
          ${!user ? `<p class="muted" style="margin-top:14px;font-size:13.5px">New to MarketHub? <a class="text-link" href="#/register">Join MarketHub</a> or <a class="text-link" href="#/login">log in</a> to start shopping.</p>` : ''}
        </div>
      </div>
    </main>`);
  }
}

async function auth(k) {
  if (k === 'login') {
    page(`<div class="auth-wrap">
      <main class="auth">
        <div class="auth-header">
          <img src="logo.png" alt="NextGen MarketHub logo" class="auth-logo">
          <h1>Welcome back</h1>
          <p class="muted">Log in to your account to continue shopping or managing your store.</p>
        </div>
        <form class="form" data-f="login">
          <label>Email<input class="input" required type="email" name="email" placeholder="name@example.com"></label>
          <label>Password<input class="input" required minlength="8" type="password" name="password" placeholder="••••••••"></label>
          <button class="btn">Log in to Account</button>
        </form>
        <p class="muted" style="margin-top:22px;text-align:center">Don't have an account? <a class="text-link" href="#/register">Join MarketHub</a></p>
      </main>
    </div>`);
  } else {
    page(`<div class="auth-wrap">
      <main class="auth">
        <div class="auth-header">
          <img src="logo.png" alt="NextGen MarketHub logo" class="auth-logo">
          <h1>Join MarketHub</h1>
          <p class="muted">Create a buyer account or register your store as a local merchant.</p>
        </div>
        <form class="form" data-f="register">
          <label>Full name<input class="input" required name="name" placeholder="e.g. Maya Johnson"></label>
          <label>Phone<input class="input" required name="phone" placeholder="e.g. +234 810 000 0000"></label>
          <label>Account type<select class="select" name="role"><option value="BUYER">Buyer (Shopping Account)</option><option value="SELLER">Seller (Store Manager)</option></select></label>
          <label>Email<input class="input" required type="email" name="email" placeholder="name@example.com"></label>
          <label>Password<input class="input" required minlength="8" type="password" name="password" placeholder="At least 8 characters"></label>
          <label>Confirm password<input class="input" required type="password" name="confirm" placeholder="Confirm password"></label>
          <button class="btn">Create MarketHub Account</button>
        </form>
        <p class="muted" style="margin-top:22px;text-align:center">Already have an account? <a class="text-link" href="#/login">Log in</a></p>
      </main>
    </div>`);
  }
}

async function cartPage() {
  cart = await api('/api/cart');
  let a = cart?.items || [], total = a.reduce((n, x) => n + x.quantity * Number(x.product.price), 0);
  page(`<main class="page">
    <h1 class="page-title">Your Cart</h1>
    ${a.length ? `
      <section class="split" style="margin-top:24px">
        <div class="card" style="padding:0 22px">
          ${a.map(x => `<div class="cart-row">
            <div class="cart-icon">${img(x.product.imageUrl, '📦')}</div>
            <div style="flex:1">
              <b>${esc(x.product.name)}</b>
              <div class="muted">${money(x.product.price)}</div>
            </div>
            <!-- FIX #3 — aria-label added; total updated in-place via JS, no full re-render -->
            <input class="input cart-qty-input" style="min-width:65px;max-width:75px" data-q="${x.productId}" data-price="${x.product.price}" type="number" min="1" max="${x.product.quantity}" value="${x.quantity}" aria-label="Quantity for ${esc(x.product.name)}">
            <button class="btn danger small" data-a="remove" data-id="${x.productId}">Remove</button>
          </div>`).join('')}
        </div>
        <aside class="cart-total">
          <div class="line big"><span>Total</span><span id="cart-total-val">${money(total)}</span></div>
          <button class="btn" style="width:100%;margin-top:16px" data-a="checkout">Place order</button>
        </aside>
      </section>
    ` : empty('Your cart is empty. <a class="text-link" href="#/products">Browse products</a>')}
  </main>`);
}

async function orders() {
  let a = await api('/api/orders');
  page(`<main class="page">
    <h1 class="page-title">${user.role === 'BUYER' ? 'Your Orders' : 'Store Orders'}</h1>
    <div class="tablewrap" style="margin-top:22px">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Store</th>
            <th>Items</th>
            <th>Total Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${a.map(o => `<tr>
            <td>#${o.id.slice(-6)}</td>
            <td><b>${esc(o.store.name)}</b></td>
            <td>${o.items.map(i => `${esc(i.productName)} ×${i.quantity}`).join(', ')}</td>
            <td><b>${money(o.totalAmount)}</b></td>
            <td>${user.role === 'SELLER' ? `
              <select class="select" data-status="${o.id}">
                ${['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(x => `<option ${x === o.status ? 'selected' : ''}>${x}</option>`).join('')}
              </select>
            ` : badge(o.status)}</td>
          </tr>`).join('') || '<tr><td colspan="5">No orders found.</td></tr>'}
        </tbody>
      </table>
    </div>
  </main>`);
}

async function accountPage() {
  if (!user) return go('/login');
  if (user.role === 'SELLER') return go('/seller');
  if (user.role === 'ADMIN') return go('/admin');

  let [cartData, ordersData, catalogProducts] = await Promise.all([
    api('/api/cart').catch(() => ({ items: [] })),
    api('/api/orders').catch(() => []),
    api('/api/products').catch(() => [])
  ]);
  let cartCount = cartData?.items?.length || 0;

  page(`<main class="page">
    <div class="buyer-dashboard">
      <div class="buyer-hero">
        <div class="buyer-avatar-wrap">
          <div class="buyer-avatar">🛍️</div>
        </div>
        <div class="buyer-info">
          <div class="buyer-badge-tag">⭐ Certified Buyer Profile · Member</div>
          <h1>Welcome, ${esc(user.name)}!</h1>
          <p>Email: <b>${esc(user.email)}</b> · Phone: <b>${esc(user.phone || 'Not provided')}</b> · Member of NextGen MarketHub</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn light" href="#/cart">🛒 View Cart (${cartCount})</a>
          <a class="btn" href="#/stores" style="background:#ffd166;color:#2b1800;border:0;font-weight:800">🏪 Shop Stores</a>
        </div>
      </div>

      <div class="buyer-stats">
        <div class="buyer-stat-card standing">
          <div class="buyer-stat-top">
            <small>Account Standing</small>
            <div class="buyer-stat-icon">⭐</div>
          </div>
          <b>${badge(user.status)}</b>
          <div class="stat-desc">Full shopping privileges active</div>
        </div>

        <div class="buyer-stat-card cart">
          <div class="buyer-stat-top">
            <small>Cart Items</small>
            <div class="buyer-stat-icon">🛍️</div>
          </div>
          <b>${cartCount} item(s)</b>
          <div class="stat-desc">Items ready in your shopping bag</div>
        </div>

        <div class="buyer-stat-card orders">
          <div class="buyer-stat-top">
            <small>Orders Placed</small>
            <div class="buyer-stat-icon">📦</div>
          </div>
          <b>${ordersData.length}</b>
          <div class="stat-desc">Total store order transactions</div>
        </div>
      </div>

      <div class="section-head">
        <div>
          <span class="eyebrow">Order Management</span>
          <h2>Your Recent Orders</h2>
          <p>Track delivery updates and order status from local merchants.</p>
        </div>
        <a class="text-link" href="#/orders">View all orders (${ordersData.length}) →</a>
      </div>
      ${ordersData.length ? `
        <div class="tablewrap">
          <table>
            <thead>
              <tr><th>Order ID</th><th>Merchant Store</th><th>Items</th><th>Total Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${ordersData.slice(0, 5).map(o => `<tr>
                <td><b>#${o.id.slice(-6)}</b></td>
                <td><b>${esc(o.store.name)}</b></td>
                <td>${o.items.map(i => `${esc(i.productName)} ×${i.quantity}`).join(', ')}</td>
                <td><b style="color:var(--darkgreen)">${money(o.totalAmount)}</b></td>
                <td>${badge(o.status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : empty('You have not placed any orders yet. <a class="text-link" href="#/products">Browse products</a>')}

      ${catalogProducts.length ? `
        <div class="section-head" style="margin-top:20px">
          <div>
            <span class="eyebrow">Recommended For You</span>
            <h2>Trending Vintage & Local Finds</h2>
            <p>Popular products handpicked by local merchants.</p>
          </div>
          <a class="text-link" href="#/products">View all products →</a>
        </div>
        <div class="grid products">
          ${catalogProducts.slice(0, 4).map(pc).join('')}
        </div>
      ` : ''}
    </div>
  </main>`);
}

function productForm(p = {}) {
  return `<form class="form statusbox" data-f="product" data-id="${p.id || ''}" style="max-width:700px">
    <label>Product name<input class="input" required maxlength="120" name="name" value="${esc(p.name || '')}"></label>
    <div class="split">
      <label>Price (₦)<input class="input" required min="1" step="1" type="number" name="price" value="${p.price || ''}"></label>
      <label>Available quantity<input class="input" required min="0" step="1" type="number" name="quantity" value="${p.quantity ?? ''}"></label>
    </div>
    <label>Category<input class="input" maxlength="80" name="category" value="${esc(p.category || '')}" placeholder="e.g. Vintage Accessories, Fresh food"></label>
    <label>Description<textarea required maxlength="2000" name="description" rows="4">${esc(p.description || '')}</textarea></label>
    <!-- FIX #5 — image upload always shown so sellers can update their product photo -->
    <label>Product image <span class="muted">(optional: PNG, JPG, or WebP${p.id && p.imageUrl ? ' · leave blank to keep current' : ''})</span>
      ${p.id && p.imageUrl ? `<div style="margin-bottom:8px"><img src="${p.imageUrl}" alt="Current product image" style="height:80px;width:80px;object-fit:cover;border-radius:8px;border:1px solid var(--line)"></div>` : ''}
      <input class="input" accept="image/png,image/jpeg,image/webp" type="file" name="image">
    </label>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button class="btn">${p.id ? 'Save product' : 'Add product'}</button>
      <a class="btn light" href="#/seller/products">Cancel</a>
    </div>
  </form>`;
}

function sellerProductCard(p) {
  return `<article class="card">
    <div class="product-img-box">
      <div class="product-img">${img(p.imageUrl, '📦')}</div>
      ${p.category ? `<span class="category-badge">${esc(p.category)}</span>` : ''}
    </div>
    <div class="card-body">
      <h3 class="product-title">${esc(p.name)}</h3>
      <div class="card-meta">
        <b class="price">${money(p.price)}</b>
        <span class="stock-pill">${p.quantity} in stock</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <a class="btn small" href="#/seller/edit/${p.id}">Edit</a>
        <button class="btn danger small" data-a="deleteproduct" data-id="${p.id}">Delete</button>
      </div>
    </div>
  </article>`;
}

async function seller(section = 'home') {
  let x = await api('/api/seller/me');
  let s = x.store;

  if (user.status !== 'APPROVED') {
    return page(`<main class="page">${empty('Your seller account is awaiting approval from MarketHub Admin.')}</main>`);
  }

  if (!s) {
    return page(`<main class="page">
      <h1 class="page-title">Register Your Store</h1>
      <p class="muted">Set up your storefront to start listing products on MarketHub.</p>
      ${storeForm()}
    </main>`);
  }

  if (section === 'orders') return orders();
  if (section === 'add' || section.startsWith('edit:')) {
    let p = section.startsWith('edit:') ? s?.products.find(item => item.id === section.slice(5)) : null;
    return page(`<main class="page">
      <h1 class="page-title">${p ? 'Edit Product' : 'Add a Product'}</h1>
      ${s?.status === 'APPROVED' ? productForm(p || {}) : empty('Your store must be approved before products can be managed.')}
    </main>`);
  }

  if (section === 'products') {
    return page(`<main class="page">
      <div class="section-head">
        <div>
          <h1 class="page-title">Store Products</h1>
          <p class="muted">Manage your stock, prices, and listings.</p>
        </div>
        ${s?.status === 'APPROVED' ? '<a class="btn" href="#/seller/add">+ Add product</a>' : ''}
      </div>
      ${s.status !== 'APPROVED' ? empty('Your store is awaiting Admin approval.') : `<div class="grid products">${s.products.map(sellerProductCard).join('') || empty('No products yet. Select “Add product” to create your first listing.')}</div>`}
    </main>`);
  }

  // Real Seller Hub Home
  let ordersList = s.orders || [];
  let completedOrders = ordersList.filter(o => o.status === 'COMPLETED');
  let revenue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
  let pendingOrders = ordersList.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED');

  page(`<main class="page">
    <div class="seller-dashboard">
      <div class="seller-hero">
        <div class="seller-hero-left">
          <div class="seller-store-seal">🏛️</div>
          <div class="seller-hero-info">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="seller-live-pill"><span class="seller-live-dot"></span> Store Live on MarketHub</span>
              ${badge(s.status)}
            </div>
            <h1>${esc(s.name)}</h1>
            <p>📍 ${esc(s.address)}, ${esc(s.city)}, ${esc(s.state)} · 📞 ${esc(s.phone)} · Owner: <b>${esc(user.name)}</b></p>
          </div>
        </div>
        <div class="seller-quickbar">
          <a class="btn" style="background:#ffd166;color:#2a1800;border:0;font-weight:800" href="#/stores/${s.id}">Storefront ↗</a>
          ${s.status === 'APPROVED' ? `<a class="btn" href="#/seller/add">+ Add Product</a>` : ''}
          <a class="btn light" href="#/seller/orders">Orders (${pendingOrders.length})</a>
        </div>
      </div>

      <div class="seller-kpi">
        <div class="seller-kpi-card revenue">
          <div class="seller-kpi-top">
            <small>Total Revenue</small>
            <div class="seller-kpi-icon">💰</div>
          </div>
          <b>${money(revenue)}</b>
          <div class="stat-desc">Earnings from completed orders</div>
        </div>

        <div class="seller-kpi-card products">
          <div class="seller-kpi-top">
            <small>Active Inventory</small>
            <div class="seller-kpi-icon">📦</div>
          </div>
          <b>${s.products.length} item(s)</b>
          <div class="stat-desc">Live catalog items in your store</div>
        </div>

        <div class="seller-kpi-card pending">
          <div class="seller-kpi-top">
            <small>Orders to Fulfill</small>
            <div class="seller-kpi-icon">⏳</div>
          </div>
          <b>${pendingOrders.length}</b>
          <div class="stat-desc">Pending customer order fulfillment</div>
        </div>

        <div class="seller-kpi-card orders">
          <div class="seller-kpi-top">
            <small>Total Store Orders</small>
            <div class="seller-kpi-icon">📈</div>
          </div>
          <b>${ordersList.length}</b>
          <div class="stat-desc">Lifetime customer transactions</div>
        </div>
      </div>

      <div class="section-head">
        <div>
          <span class="eyebrow">Inventory Overview</span>
          <h2>Quick Stock Management</h2>
          <p>Review current listings, adjust quantities, or add new stock.</p>
        </div>
        <a class="text-link" href="#/seller/products">View all products (${s.products.length}) →</a>
      </div>
      <div class="grid products">
        ${s.products.slice(0, 4).map(sellerProductCard).join('') || empty('No products listed yet. Click "+ Add Product" to get started.')}
      </div>

      <div class="section-head" style="margin-top:20px">
        <div>
          <span class="eyebrow">Fulfillment Center</span>
          <h2>Recent Customer Orders</h2>
          <p>Update order delivery status to notify buyers in real time.</p>
        </div>
        <a class="text-link" href="#/seller/orders">All orders (${ordersList.length}) →</a>
      </div>
      <div class="tablewrap">
        <table>
          <thead><tr><th>Order ID</th><th>Customer / Items</th><th>Total Amount</th><th>Status</th><th>Update Fulfillment</th></tr></thead>
          <tbody>
            ${ordersList.slice(0, 5).map(o => `<tr>
              <td><b>#${o.id.slice(-6)}</b></td>
              <td>${o.items.map(i => `${esc(i.productName)} ×${i.quantity}`).join(', ')}</td>
              <td><b style="color:var(--darkgreen)">${money(o.totalAmount)}</b></td>
              <td>${badge(o.status)}</td>
              <td>
                <select class="select" data-status="${o.id}">
                  ${['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'].map(st => `<option ${st === o.status ? 'selected' : ''}>${st}</option>`).join('')}
                </select>
              </td>
            </tr>`).join('') || '<tr><td colspan="5">No customer orders yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </main>`);
}

function storeForm() {
  return `<form class="form statusbox" data-f="store">
    <label>Store Name<input class="input" name="name" required placeholder="e.g. The Heritage Vault"></label>
    <label>Store Description<textarea name="description" required placeholder="Tell customers about your store, products, and story..."></textarea></label>
    <label>Address<input class="input" name="address" required placeholder="Street address"></label>
    <div class="split">
      <label>City<input class="input" name="city" required placeholder="e.g. Lekki"></label>
      <label>State<input class="input" name="state" required placeholder="e.g. Lagos"></label>
    </div>
    <label>Country<input class="input" name="country" value="Nigeria" required></label>
    <label>Store Contact Phone<input class="input" name="phone" required placeholder="e.g. +234 803 000 0000"></label>
    <button class="btn">Submit store for approval</button>
  </form>`;
}

function adminHeader(activeTab, stats = {}) {
  const tabs = [
    { key: 'home', label: 'Overview', href: '#/admin', count: null },
    { key: 'sellers', label: 'Sellers', href: '#/admin/sellers', count: stats.pendingSellers, isPending: true },
    { key: 'stores', label: 'Stores', href: '#/admin/stores', count: stats.pendingStores, isPending: true },
    { key: 'products', label: 'Products', href: '#/admin/products', count: stats.products },
    { key: 'orders', label: 'Orders', href: '#/admin/orders', count: stats.orders }
  ];

  return `
    <div class="admin-hero">
      <div class="admin-hero-left">
        <div class="admin-badge-icon">🛡️</div>
        <div class="admin-hero-title">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span class="eyebrow" style="color:#8ee0a9;letter-spacing:1.5px">Marketplace Administration</span>
            <span class="admin-system-status"><span class="admin-system-dot"></span> System Live</span>
          </div>
          <h1>MarketHub Admin Portal</h1>
          <p>Real-time governance, merchant verifications, product moderation, and order monitoring.</p>
        </div>
      </div>
    </div>

    <div class="admin-tabs" style="margin-top:20px">
      ${tabs.map(t => `
        <a class="admin-tab ${activeTab === t.key ? 'active' : ''}" href="${t.href}">
          ${t.label}
          ${t.count !== null && t.count !== undefined ? `<span class="admin-tab-count ${t.isPending && t.count > 0 ? 'pending' : ''}">${t.count}</span>` : ''}
        </a>
      `).join('')}
    </div>
  `;
}

function adminInitials(name) {
  return String(name || '').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'U';
}

async function admin(k = 'home') {
  let stats = await api('/api/admin/dashboard').catch(() => ({
    sellers: 0, pendingSellers: 0, stores: 0, pendingStores: 0, products: 0, orders: 0
  }));

  if (k === 'home') {
    let [sellersList, storesList, ordersList] = await Promise.all([
      api('/api/admin/sellers').catch(() => []),
      api('/api/admin/stores').catch(() => []),
      api('/api/orders').catch(() => [])
    ]);

    let pendingSellers = sellersList.filter(s => s.status === 'PENDING');
    let pendingStores = storesList.filter(s => s.status === 'PENDING');

    return page(`<main class="page">
      <div class="admin-dashboard">
        ${adminHeader('home', stats)}

        <div class="admin-kpi-grid">
          <div class="admin-kpi-card sellers">
            <div class="admin-kpi-top">
              <small>Total Sellers</small>
              <div class="admin-kpi-icon">👥</div>
            </div>
            <div class="admin-kpi-val">${stats.sellers}</div>
            <div class="admin-kpi-sub">
              ${stats.pendingSellers > 0 ? `<span class="badge pending">${stats.pendingSellers} awaiting review</span>` : `<span class="badge approved">All approved</span>`}
            </div>
          </div>

          <div class="admin-kpi-card stores">
            <div class="admin-kpi-top">
              <small>Total Stores</small>
              <div class="admin-kpi-icon">🏛️</div>
            </div>
            <div class="admin-kpi-val">${stats.stores}</div>
            <div class="admin-kpi-sub">
              ${stats.pendingStores > 0 ? `<span class="badge pending">${stats.pendingStores} pending review</span>` : `<span class="badge approved">All verified</span>`}
            </div>
          </div>

          <div class="admin-kpi-card products">
            <div class="admin-kpi-top">
              <small>Marketplace Listings</small>
              <div class="admin-kpi-icon">📦</div>
            </div>
            <div class="admin-kpi-val">${stats.products}</div>
            <div class="admin-kpi-sub">
              <span class="muted">Live catalog products</span>
            </div>
          </div>

          <div class="admin-kpi-card orders">
            <div class="admin-kpi-top">
              <small>Platform Orders</small>
              <div class="admin-kpi-icon">🛒</div>
            </div>
            <div class="admin-kpi-val">${stats.orders}</div>
            <div class="admin-kpi-sub">
              <span class="muted">Processed transactions</span>
            </div>
          </div>
        </div>

        <div class="admin-split">
          <div class="admin-card">
            <div class="admin-card-head">
              <h3>⏳ Pending Seller Approvals (${pendingSellers.length})</h3>
              <a class="text-link" href="#/admin/sellers">Manage all →</a>
            </div>
            <div class="admin-card-body">
              ${pendingSellers.length ? pendingSellers.map(s => `
                <div class="admin-item-row">
                  <div class="admin-user-cell">
                    <div class="admin-avatar-chip">${adminInitials(s.fullName)}</div>
                    <div>
                      <b>${esc(s.fullName)}</b>
                      <div class="muted" style="font-size:12.5px">${esc(s.email)} · ${esc(s.phone)}</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="admin-btn-approve" data-review="seller:APPROVED:${s.id}">✓ Approve</button>
                    <button class="admin-btn-reject" data-review="seller:REJECTED:${s.id}">✕ Reject</button>
                  </div>
                </div>
              `).join('') : empty('No seller applications awaiting approval.')}
            </div>
          </div>

          <div class="admin-card">
            <div class="admin-card-head">
              <h3>🏪 Pending Store Approvals (${pendingStores.length})</h3>
              <a class="text-link" href="#/admin/stores">Manage all →</a>
            </div>
            <div class="admin-card-body">
              ${pendingStores.length ? pendingStores.map(st => `
                <div class="admin-item-row">
                  <div class="admin-user-cell">
                    <div class="admin-avatar-chip store">🏛️</div>
                    <div>
                      <b>${esc(st.name)}</b>
                      <div class="muted" style="font-size:12.5px">Owner: ${esc(st.seller?.fullName || 'Seller')} · 📍 ${esc(st.city)}, ${esc(st.state)}</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="admin-btn-approve" data-review="store:APPROVED:${st.id}">✓ Approve</button>
                    <button class="admin-btn-reject" data-review="store:REJECTED:${st.id}">✕ Reject</button>
                  </div>
                </div>
              `).join('') : empty('No store registrations awaiting approval.')}
            </div>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <div>
              <span class="eyebrow">Commerce Activity</span>
              <h3 style="margin-top:2px">Recent Marketplace Orders</h3>
            </div>
            <a class="text-link" href="#/admin/orders">View all orders (${ordersList.length}) →</a>
          </div>
          <div class="tablewrap" style="border:0;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Store</th>
                  <th>Items Purchased</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${ordersList.slice(0, 6).map(o => `
                  <tr>
                    <td>#${o.id.slice(-6)}</td>
                    <td><b>${esc(o.store.name)}</b></td>
                    <td>${o.items.map(i => `${esc(i.productName)} ×${i.quantity}`).join(', ')}</td>
                    <td><b>${money(o.totalAmount)}</b></td>
                    <td>${badge(o.status)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No marketplace orders placed yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`);
  }

  if (k === 'sellers') {
    let sellers = await api('/api/admin/sellers');
    return page(`<main class="page">
      <div class="admin-dashboard">
        ${adminHeader('sellers', stats)}

        <div class="admin-tablewrap">
          <div class="admin-table-head-bar">
            <div>
              <h2 style="font:800 20px 'Plus Jakarta Sans';margin:0 0 4px">Seller Accounts Directory</h2>
              <p class="muted" style="margin:0;font-size:13px">Review merchant credentials and grant or revoke selling privileges.</p>
            </div>
            <span class="muted">${sellers.length} registered seller(s)</span>
          </div>
          <div class="tablewrap" style="border:0;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${sellers.map(s => `
                  <tr>
                    <td>
                      <div class="admin-user-cell">
                        <div class="admin-avatar-chip">${adminInitials(s.fullName)}</div>
                        <b>${esc(s.fullName)}</b>
                      </div>
                    </td>
                    <td>${esc(s.email)}</td>
                    <td>${esc(s.phone || 'N/A')}</td>
                    <td>${badge(s.status)}</td>
                    <td>
                      <div style="display:flex;gap:6px">
                        ${s.status !== 'APPROVED' ? `<button class="admin-btn-approve" data-review="seller:APPROVED:${s.id}">✓ Approve</button>` : ''}
                        ${s.status !== 'REJECTED' ? `<button class="admin-btn-reject" data-review="seller:REJECTED:${s.id}">✕ Reject</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No sellers registered yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`);
  }

  if (k === 'stores') {
    let storesList = await api('/api/admin/stores');
    return page(`<main class="page">
      <div class="admin-dashboard">
        ${adminHeader('stores', stats)}

        <div class="admin-tablewrap">
          <div class="admin-table-head-bar">
            <div>
              <h2 style="font:800 20px 'Plus Jakarta Sans';margin:0 0 4px">Storefront Approvals</h2>
              <p class="muted" style="margin:0;font-size:13px">Approve verified merchant stores before they can list products to buyers.</p>
            </div>
            <span class="muted">${storesList.length} store(s)</span>
          </div>
          <div class="tablewrap" style="border:0;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${storesList.map(s => `
                  <tr>
                    <td>
                      <div class="admin-user-cell">
                        <div class="admin-avatar-chip store">🏛️</div>
                        <div>
                          <b>${esc(s.name)}</b>
                          <div class="muted" style="font-size:12px">${esc(s.description?.slice(0, 45))}...</div>
                        </div>
                      </div>
                    </td>
                    <td>${esc(s.seller?.fullName || 'Seller')}</td>
                    <td>📍 ${esc(s.city)}, ${esc(s.state)}</td>
                    <td>${esc(s.phone)}</td>
                    <td>${badge(s.status)}</td>
                    <td>
                      <div style="display:flex;gap:6px">
                        ${s.status !== 'APPROVED' ? `<button class="admin-btn-approve" data-review="store:APPROVED:${s.id}">✓ Approve</button>` : ''}
                        ${s.status !== 'REJECTED' ? `<button class="admin-btn-reject" data-review="store:REJECTED:${s.id}">✕ Reject</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6">No stores registered yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`);
  }

  if (k === 'products') {
    let productsList = await api('/api/admin/products');
    return page(`<main class="page">
      <div class="admin-dashboard">
        ${adminHeader('products', stats)}

        <div class="admin-tablewrap">
          <div class="admin-table-head-bar">
            <div>
              <h2 style="font:800 20px 'Plus Jakarta Sans';margin:0 0 4px">Product Catalog Moderation</h2>
              <p class="muted" style="margin:0;font-size:13px">Monitor all live merchandise, verify pricing, and remove non-compliant listings.</p>
            </div>
            <span class="muted">${productsList.length} product(s) active</span>
          </div>
          <div class="tablewrap" style="border:0;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Product Listing</th>
                  <th>Store</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Inventory</th>
                  <th>Moderation Action</th>
                </tr>
              </thead>
              <tbody>
                ${productsList.map(p => `
                  <tr>
                    <td>
                      <div class="admin-user-cell">
                        <div style="width:40px;height:40px;border-radius:8px;background:#f0f7f3;display:grid;place-items:center;font-size:18px">📦</div>
                        <b>${esc(p.name)}</b>
                      </div>
                    </td>
                    <td><a class="text-link" href="#/stores/${p.storeId}">${esc(p.store?.name || 'Store')}</a></td>
                    <td><span class="badge" style="background:#eef2ff;color:#4338ca">${esc(p.category || 'General')}</span></td>
                    <td><b>${money(p.price)}</b></td>
                    <td>${p.quantity > 5 ? `<span class="badge approved">${p.quantity} in stock</span>` : `<span class="badge pending">Low stock: ${p.quantity}</span>`}</td>
                    <td>
                      <button class="btn danger small" data-a="admin-deleteproduct" data-id="${p.id}">Remove Listing</button>
                    </td>
                  </tr>
                `).join('') || '<tr><td colspan="6">No active product listings in marketplace.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`);
  }

  if (k === 'orders') {
    let ordersList = await api('/api/orders');
    return page(`<main class="page">
      <div class="admin-dashboard">
        ${adminHeader('orders', stats)}

        <div class="admin-tablewrap">
          <div class="admin-table-head-bar">
            <div>
              <h2 style="font:800 20px 'Plus Jakarta Sans';margin:0 0 4px">All Marketplace Orders</h2>
              <p class="muted" style="margin:0;font-size:13px">Real-time ledger of orders placed across all merchant storefronts.</p>
            </div>
            <span class="muted">${ordersList.length} total orders</span>
          </div>
          <div class="tablewrap" style="border:0;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Merchant Store</th>
                  <th>Line Items</th>
                  <th>Total (₦)</th>
                  <th>Fulfillment Status</th>
                </tr>
              </thead>
              <tbody>
                ${ordersList.map(o => `
                  <tr>
                    <td><b>#${o.id.slice(-6)}</b></td>
                    <td><b>${esc(o.store.name)}</b></td>
                    <td>${o.items.map(i => `${esc(i.productName)} ×${i.quantity}`).join(', ')}</td>
                    <td><b style="color:var(--darkgreen)">${money(o.totalAmount)}</b></td>
                    <td>${badge(o.status)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No orders recorded in the system yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>`);
  }
}

function actions(t, id) {
  return `<div style="display:flex;gap:6px">
    <button class="admin-btn-approve" data-review="${t}:APPROVED:${id}">✓ Approve</button>
    <button class="admin-btn-reject" data-review="${t}:REJECTED:${id}">✕ Reject</button>
  </div>`;
}

async function route() {
  $('#auth-modal')?.remove();
  try {
    user = (await api('/api/auth/me')).user;
  } catch {
    user = null;
  }

  let p = location.hash.slice(1).split('?')[0] || '/';
  try {
    if (p === '/') await home();
    else if (p === '/stores') await list('stores');
    else if (p === '/products') await list('products');
    else if (p.startsWith('/stores/')) await show('stores', p.split('/')[2]);
    else if (p.startsWith('/products/')) await show('products', p.split('/')[2]);
    else if (p === '/login') await auth('login');
    else if (p === '/register') await auth('register');
    else if (p === '/account') await accountPage();
    else if (p === '/cart') await cartPage();
    else if (p === '/orders') await orders();
    else if (p === '/seller') await seller();
    else if (p === '/seller/store') {
      let x = await api('/api/seller/me'), s = x.store;
      page(`<main class="page">
        <h1 class="page-title">My Store</h1>
        ${s ? `
          <div class="statusbox">
            <h2>${esc(s.name)}</h2>
            <p>${badge(s.status)}</p>
            <p>${esc(s.description)}</p>
            <p>📍 ${esc(s.address)}, ${esc(s.city)}, ${esc(s.state)}, ${esc(s.country)}</p>
            <p>📞 ${esc(s.phone)}</p>
          </div>
        ` : empty('You have not registered a store yet.')}
      </main>`);
    } else if (p === '/seller/products') await seller('products');
    else if (p === '/seller/add') await seller('add');
    else if (p.startsWith('/seller/edit/')) await seller('edit:' + p.split('/')[3]);
    else if (p === '/seller/orders') await seller('orders');
    else if (p === '/admin') await admin();
    else if (p.startsWith('/admin/')) await admin(p.split('/')[2]);
    else page(empty('Page not found.'));
  } catch (e) {
    page(`<main class="page">${empty(esc(e.message))}</main>`);
  }
}

document.addEventListener('submit', async e => {
  let f = e.target;
  if (!f.dataset.f) return;
  e.preventDefault();
  let formData = new FormData(f), d = Object.fromEntries(formData), k = f.dataset.f;

  try {
    if (k === 'search' || k === 'products' || k === 'stores') {
      return go(`/${k === 'search' ? 'products' : k}?q=${encodeURIComponent(d.q)}`);
    }

    if (k === 'register' && d.password !== d.confirm) {
      return toast('Passwords do not match.');
    }

    if (k === 'product') {
      let price = Number(d.price), quantity = Number(d.quantity);
      if (!d.name.trim() || !d.description.trim() || !Number.isInteger(price) || price < 1 || !Number.isInteger(quantity) || quantity < 0) {
        return toast('Enter a name, whole-number price, valid quantity, and description.');
      }
      let endpoint = '/api/seller/products' + (f.dataset.id ? '/' + f.dataset.id : '');
      // FIX #5 — when editing, always use FormData so image upload is included
      let body;
      if (f.dataset.id) {
        // Use FormData for PATCH too so image file can be updated; server ignores empty file field gracefully
        let fd = new FormData(f);
        // Patch: send as JSON if no new image file was selected (backend PATCH expects JSON)
        let hasNewImage = fd.get('image') && fd.get('image').size > 0;
        body = hasNewImage ? fd : JSON.stringify({ name: d.name, description: d.description, price, quantity, category: d.category });
      } else {
        body = formData;
      }
      await api(endpoint, { method: f.dataset.id ? 'PATCH' : 'POST', body });
      toast(f.dataset.id ? 'Product updated.' : 'Product added.');
      return go('/seller/products');
    }

    // FIX #4 — strip 'confirm' field so it is never sent to the register API
    if (k === 'register') delete d.confirm;

    let r = await api(k === 'login' ? '/api/auth/login' : k === 'register' ? '/api/auth/register' : '/api/seller/store', {
      method: 'POST',
      body: JSON.stringify(d)
    });

    if (k === 'store') {
      toast('Store submitted for approval.');
      go('/seller');
    } else {
      user = r.user;
      toast(k === 'register' && user.role === 'SELLER' ? 'Your seller account is awaiting approval.' : 'Welcome to MarketHub.');
      go(user.role === 'ADMIN' ? '/admin' : user.role === 'SELLER' ? '/seller' : '/');
    }
  } catch (x) {
    toast(x.message);
  }
});

document.addEventListener('click', async e => {
  if (e.target.closest('[data-modal-close]') || e.target.classList.contains('modal-backdrop')) {
    $('#auth-modal')?.remove();
  }

  // FIX #1 — close mobile nav when any nav link inside it is tapped
  if (e.target.closest('#mobile-nav a')) {
    const nav = document.getElementById('mobile-nav');
    const btn = document.querySelector('.hamburger');
    if (nav) nav.classList.remove('open');
    if (btn) { btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
  }

  let b = e.target.closest('button');
  if (!b) return;

  try {
    if (b.dataset.a === 'logout') {
      await api('/api/auth/logout', { method: 'POST' });
      user = null;
      toast('You have been logged out.');
      if (location.hash === '#/login') route();
      else go('/login');
      return;
    }

    if (b.dataset.a === 'cart') {
      if (!user) {
        authModal('To add items to your cart, please join MarketHub or log in with your account.');
        toast('Please join MarketHub or log in to add items to your cart.');
        return;
      }
      if (user.role !== 'BUYER') {
        toast('Only buyer accounts can add items to the cart. Please log in with a buyer account.');
        return;
      }
      // FIX #2 — read quantity from data-qty attribute selector instead of id
      let q = Number(document.querySelector('[data-qty="detail"]')?.value || 1);
      await api('/api/cart/' + b.dataset.id, { method: 'PUT', body: JSON.stringify({ quantity: q }) });
      toast('Added to your cart.');
      return;
    }

    if (b.dataset.a === 'hamburger') {
      // FIX #1 — toggle mobile nav
      const nav = document.getElementById('mobile-nav');
      const open = nav.classList.toggle('open');
      b.setAttribute('aria-expanded', open);
      b.classList.toggle('is-open', open);
      return;
    }

    if (b.dataset.a === 'remove') {
      await api('/api/cart/' + b.dataset.id, { method: 'DELETE' });
      return route();
    }

    if (b.dataset.a === 'checkout') {
      await api('/api/orders/checkout', { method: 'POST' });
      toast('Order placed successfully.');
      go('/orders');
      return;
    }

    if (b.dataset.a === 'deleteproduct') {
      await api('/api/seller/products/' + b.dataset.id, { method: 'DELETE' });
      toast('Product deleted.');
      return route();
    }

    if (b.dataset.a === 'admin-deleteproduct') {
      await api('/api/admin/products/' + b.dataset.id, { method: 'DELETE' });
      toast('Product removed.');
      return route();
    }

    if (b.dataset.review) {
      let [t, status, id] = b.dataset.review.split(':');
      await api(`/api/admin/${t === 'seller' ? 'sellers' : 'stores'}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      toast(`${t} ${status.toLowerCase()}.`);
      return route();
    }
  } catch (x) {
    toast(x.message);
  }
});

document.addEventListener('change', async e => {
  try {
    if (e.target.dataset.q) {
      // FIX #3 — update total in-place without a full page re-render
      const input = e.target;
      const qty = Number(input.value);
      const price = Number(input.dataset.price || 0);
      await api('/api/cart/' + input.dataset.q, { method: 'PUT', body: JSON.stringify({ quantity: qty }) });
      // Recalculate total from all visible cart quantity inputs
      const allInputs = document.querySelectorAll('.cart-qty-input');
      let newTotal = 0;
      allInputs.forEach(el => { newTotal += Number(el.value) * Number(el.dataset.price || 0); });
      const totalEl = document.getElementById('cart-total-val');
      if (totalEl) totalEl.textContent = money(newTotal);
    }
    if (e.target.dataset.status) {
      await api('/api/seller/orders/' + e.target.dataset.status, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
      toast('Order status updated.');
    }
  } catch (x) {
    toast(x.message);
  }
});

window.addEventListener('hashchange', route);
route();
