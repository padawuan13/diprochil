import { describe, it, expect } from '@jest/globals';

describe('Auth Module', () => {
  describe('JWT Token', () => {
    it('should validate correct JWT secret is set', () => {
      const secret = process.env.JWT_SECRET;
      expect(secret).toBeDefined();
      expect(secret).not.toBe('');
      expect(secret!.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const bcrypt = await import('bcryptjs');
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
