import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies correctly', async () => {
    const hash = await hashPassword('mypassword123');
    expect(hash).toMatch(/^pbkdf2:\d+:[a-f0-9]+:[a-f0-9]+$/);
    expect(await verifyPassword('mypassword123', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct_password');
    expect(await verifyPassword('wrong_password', hash)).toBe(false);
  });

  it('produces different hashes for same password (random salt)', async () => {
    const hash1 = await hashPassword('same_pass');
    const hash2 = await hashPassword('same_pass');
    expect(hash1).not.toBe(hash2);
    // But both verify
    expect(await verifyPassword('same_pass', hash1)).toBe(true);
    expect(await verifyPassword('same_pass', hash2)).toBe(true);
  });

  it('rejects malformed hash', async () => {
    expect(await verifyPassword('pass', 'not_a_hash')).toBe(false);
    expect(await verifyPassword('pass', '')).toBe(false);
  });
});
