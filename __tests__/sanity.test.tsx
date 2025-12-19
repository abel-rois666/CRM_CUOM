import { describe, it, expect } from 'vitest';

describe('Sanity Check', () => {
    it('should pass basic math', () => {
        expect(1 + 1).toBe(2);
    });

    it('should ignore this test if env is broken', () => {
        // Just a placeholder
        expect(true).toBe(true);
    });
});
