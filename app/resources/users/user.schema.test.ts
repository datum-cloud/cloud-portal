import { userSchema } from './user.schema';
import { describe, expect, it } from 'vitest';

const parseName = (firstName: string, lastName: string) =>
  userSchema.safeParse({ firstName, lastName, email: 'jane@example.com' });

describe('userSchema name fields', () => {
  it.each([
    ['plain', 'Jane', 'Doe'],
    ['short names', 'Bo', 'Li'],
    ['single letter', 'J', 'Wu'],
    ['hyphen and apostrophe', 'Jean-Luc', "O'Brien"],
    ['typographic apostrophe', 'Dara', 'O’Neill'],
    ['initial with period', 'J.', 'Smith Jr.'],
    ['accented letters', 'José', 'Müller'],
    ['non-Latin script', 'Алексей', 'Иванов'],
    ['multi-word', 'Mary Ann', 'van der Berg'],
  ])('accepts real names (%s)', (_label, firstName, lastName) => {
    expect(parseName(firstName, lastName).success).toBe(true);
  });

  it.each([
    ['email as last name', 'Mario', 'markub82@gmail.com'],
    ['email as first name', 'juliopenayoo@gmail.com', 'Pena'],
    ['bare @ handle', 'Jane', '@janedoe'],
    ['URL', 'Jane', 'https://spam.example'],
    ['www domain', 'www.example.com', 'Doe'],
    ['digits', 'Jane', 'markub82'],
    ['only digits', 'Jane', '12345'],
    ['underscore handle', 'git_happens', 'Doe'],
    ['emoji', 'Jane', 'Doe 🚀'],
    ['starts with punctuation', '-Jane', 'Doe'],
    ['empty', '', 'Doe'],
    ['too long', 'Jane', 'a'.repeat(51)],
  ])('rejects non-names (%s)', (_label, firstName, lastName) => {
    expect(parseName(firstName, lastName).success).toBe(false);
  });

  it('rejects identical first and last names, ignoring case, on the last name field', () => {
    const result = parseName('Mario', ' mario ');

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([['lastName']]);
  });

  it('trims surrounding whitespace before validating', () => {
    const result = parseName('  Jane  ', ' Doe ');
    expect(result.success && result.data).toMatchObject({ firstName: 'Jane', lastName: 'Doe' });
  });
});
