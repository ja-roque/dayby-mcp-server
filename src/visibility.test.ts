import { describe, it, expect } from 'vitest';
import { toApiVisibility, fromApiVisibility } from './visibility.js';

describe('Visibility mapping', () => {
  describe('toApiVisibility', () => {
    it('maps "published" to "publik"', () => {
      expect(toApiVisibility('published')).toBe('publik');
    });

    it('passes "draft" through unchanged', () => {
      expect(toApiVisibility('draft')).toBe('draft');
    });

    it('passes "hidden" through unchanged', () => {
      expect(toApiVisibility('hidden')).toBe('hidden');
    });
  });

  describe('fromApiVisibility', () => {
    it('maps "publik" to "published"', () => {
      expect(fromApiVisibility('publik')).toBe('published');
    });

    it('passes "draft" through unchanged', () => {
      expect(fromApiVisibility('draft')).toBe('draft');
    });

    it('passes "hidden" through unchanged', () => {
      expect(fromApiVisibility('hidden')).toBe('hidden');
    });
  });

  describe('round-trip', () => {
    it('published -> publik -> published', () => {
      expect(fromApiVisibility(toApiVisibility('published'))).toBe('published');
    });

    it('draft -> draft -> draft', () => {
      expect(fromApiVisibility(toApiVisibility('draft'))).toBe('draft');
    });
  });
});
