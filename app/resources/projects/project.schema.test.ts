import { updateProjectSchema } from './project.schema';
import { describe, expect, it } from 'bun:test';

describe('updateProjectSchema', () => {
  it('rejects an empty project name so Save cannot silently no-op', () => {
    expect(updateProjectSchema.safeParse({ description: '' }).success).toBe(false);
  });

  it('accepts a non-empty project name', () => {
    expect(updateProjectSchema.safeParse({ description: 'My Project' }).success).toBe(true);
  });

  it('still allows updates that touch only annotations', () => {
    expect(updateProjectSchema.safeParse({ annotations: { a: 'b' } }).success).toBe(true);
  });
});
