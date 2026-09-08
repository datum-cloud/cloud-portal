import {
  disabledCategoryIds,
  isCategoryEnabled,
  mergeCatalogExclusions,
} from './owasp-crs-catalog';
import { describe, expect, it } from 'bun:test';

describe('owasp-crs-catalog', () => {
  it('treats missing exclusions as all categories enabled', () => {
    expect(disabledCategoryIds(undefined)).toEqual([]);
    expect(
      isCategoryEnabled({ id: 'sqli', label: 'SQL', description: '', tags: ['attack-sqli'] })
    ).toBe(true);
  });

  it('disables a category when its tag is excluded', () => {
    expect(disabledCategoryIds({ tags: ['attack-sqli'] })).toEqual(['sqli']);
  });

  it('writes excluded category tags and preserves custom ids', () => {
    expect(mergeCatalogExclusions({ ids: [920100] }, ['sqli', 'xss'])).toEqual({
      tags: ['attack-sqli', 'attack-xss'],
      ids: [920100],
    });
  });

  it('clears catalog tags when every category is enabled and keeps custom ids', () => {
    expect(mergeCatalogExclusions({ tags: ['attack-sqli'], ids: [920100] }, [])).toEqual({
      ids: [920100],
    });
  });

  it('returns undefined when nothing remains to exclude', () => {
    expect(mergeCatalogExclusions({ tags: ['attack-sqli'] }, [])).toBeUndefined();
  });

  it('preserves non-catalog tags', () => {
    expect(mergeCatalogExclusions({ tags: ['custom-tag', 'attack-sqli'] }, ['xss'])).toEqual({
      tags: ['custom-tag', 'attack-xss'],
    });
  });
});
