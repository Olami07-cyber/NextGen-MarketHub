import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

describe('temporary server migration guardrails', () => {
  test('browser client has no local-storage business database', () => {
    expect(readFileSync('app.js', 'utf8')).not.toContain('localStorage');
  });
  test('future Prisma schema keeps all core models', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    for (const name of ['User', 'Store', 'Product', 'Cart', 'CartItem', 'Order', 'OrderItem']) expect(schema).toContain(`model ${name}`);
  });
});
