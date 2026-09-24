import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import serverModule from '../src/server.js';

const { app, db } = serverModule;

describe('Cart authentication and guest prompt behavior', () => {
  test('client contains authModal and clear prompt to join MarketHub or log in', () => {
    const clientCode = readFileSync('app.js', 'utf8');
    expect(clientCode).toContain('Join MarketHub or Log In');
    expect(clientCode).toContain('Please join MarketHub or log in to add items to your cart.');
    expect(clientCode).toContain('authModal');
    expect(clientCode).not.toContain('localStorage');
  });

  test('landing page features big logo, action buttons and green theme for guests', () => {
    const clientCode = readFileSync('app.js', 'utf8');
    expect(clientCode).toContain('landing-logo');
    expect(clientCode).toContain('src="logo.png"');
    expect(clientCode).toContain('landing-cta');
    expect(clientCode).toContain('landing-wrap');
    // Ensure guest landing page does not render store grid
    const landingMatch = clientCode.match(/if \(!user\) \{[\s\S]*?return;\s*\}/);
    expect(landingMatch).not.toBeNull();
    const guestLanding = landingMatch[0];
    expect(guestLanding).not.toContain('stores.slice');
    expect(guestLanding).not.toContain('stores.map');
  });

  test('login page displays only welcome back and input credentials without side stores pane', () => {
    const clientCode = readFileSync('app.js', 'utf8');
    const authFnMatch = clientCode.match(/async function auth\(k\) \{[\s\S]*?\n\}/);
    expect(authFnMatch).not.toBeNull();
    const authFn = authFnMatch[0];
    expect(authFn).toContain('Welcome back');
    expect(authFn).toContain('name="email"');
    expect(authFn).toContain('name="password"');
    expect(authFn).not.toContain('auth-stores-pane');
    expect(authFn).not.toContain('Stores on MarketHub');
  });

  test('PUT /api/cart/:productId without session returns 401 with friendly join/login instruction', async () => {
    const product = db.products.find(p => p.status === 'APPROVED');
    expect(product).toBeDefined();

    const res = await request(app)
      .put(`/api/cart/${product.id}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please join MarketHub or log in to add items to your cart.');
  });

  test('GET /api/cart without session returns 401 with friendly join/login instruction', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please join MarketHub or log in to add items to your cart.');
  });

  test('PUT /api/cart/:productId as a seller returns 403 specifying buyer account requirement', async () => {
    const sellerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ama@freshnest.local', password: 'DevPassword123!' });

    expect(sellerLogin.status).toBe(200);
    const cookie = sellerLogin.headers['set-cookie'];

    const product = db.products.find(p => p.status === 'APPROVED');
    const res = await request(app)
      .put(`/api/cart/${product.id}`)
      .set('Cookie', cookie)
      .send({ quantity: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Only buyer accounts can add items to the cart.');
  });

  test('PUT /api/cart/:productId as a buyer succeeds', async () => {
    const buyerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maya@example.local', password: 'DevPassword123!' });

    expect(buyerLogin.status).toBe(200);
    const cookie = buyerLogin.headers['set-cookie'];

    const product = db.products.find(p => p.status === 'APPROVED');
    const res = await request(app)
      .put(`/api/cart/${product.id}`)
      .set('Cookie', cookie)
      .send({ quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.productId).toBe(product.id);
    expect(res.body.quantity).toBe(1);
  });

  test('client logout click action redirects back to login page', () => {
    const clientCode = readFileSync('app.js', 'utf8');
    expect(clientCode).toContain("b.dataset.a === 'logout'");
    expect(clientCode).toContain("go('/login')");
  });
});
