import { describe, it, expect } from '@jest/globals';

describe('Utility Functions', () => {
  describe('RUT normalization', () => {
    it('should normalize Chilean RUT format', () => {
      function normalizeRut(raw: string): string {
        return String(raw ?? "")
          .trim()
          .toUpperCase()
          .replace(/\./g, "")
          .replace(/-/g, "")
          .replace(/\s+/g, "");
      }

      expect(normalizeRut('12.345.678-9')).toBe('123456789');
      expect(normalizeRut('12345678-9')).toBe('123456789');
      expect(normalizeRut('123456789')).toBe('123456789');
      expect(normalizeRut('12.345.678-K')).toBe('12345678K');
    });

    it('should format RUT to canonical form', () => {
      function canonicalRut(raw: string): string {
        const normalizeRut = (r: string) =>
          String(r ?? "")
            .trim()
            .toUpperCase()
            .replace(/\./g, "")
            .replace(/-/g, "")
            .replace(/\s+/g, "");

        const n = normalizeRut(raw);
        if (n.length < 2) return n;
        return `${n.slice(0, -1)}-${n.slice(-1)}`;
      }

      expect(canonicalRut('123456789')).toBe('12345678-9');
      expect(canonicalRut('12.345.678-9')).toBe('12345678-9');
      expect(canonicalRut('12345678K')).toBe('12345678-K');
    });
  });

  describe('Environment Variables', () => {
    it('should have required environment variables', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
    });
  });
});
