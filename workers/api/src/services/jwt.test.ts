import { describe, it, expect, vi, afterEach } from 'vitest';
import { createToken, verifyToken } from './jwt';

const SECRET = 'test_jwt_secret_key';

describe('JWT', () => {
  it('creates and verifies a valid token', async () => {
    const token = await createToken('owner_001', SECRET);
    expect(token.split('.').length).toBe(3);

    const payload = await verifyToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('owner_001');
  });

  it('rejects token with wrong secret', async () => {
    const token = await createToken('owner_001', SECRET);
    const payload = await verifyToken(token, 'wrong_secret');
    expect(payload).toBeNull();
  });

  it('rejects malformed token', async () => {
    expect(await verifyToken('not.a.token', SECRET)).toBeNull();
    expect(await verifyToken('', SECRET)).toBeNull();
    expect(await verifyToken('x', SECRET)).toBeNull();
  });

  it('rejects expired token', async () => {
    // Mock Date.now to create an expired token
    const realNow = Date.now;
    const pastTime = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
    vi.spyOn(Date, 'now').mockReturnValueOnce(pastTime);

    const token = await createToken('owner_001', SECRET);

    // Restore Date.now for verification
    vi.restoreAllMocks();

    const payload = await verifyToken(token, SECRET);
    expect(payload).toBeNull();
  });
});
