import { userSchema } from './user.schema';
import { describe, expect, it } from 'bun:test';

const parseName = (firstName: string, lastName: string) =>
  userSchema.safeParse({ firstName, lastName, email: 'jane@example.com' });

describe('userSchema name fields', () => {
  it.each([
    ['plain', 'Jane', 'Doe'],
    ['hyphen and apostrophe', 'Jean-Luc', "O'Brien"],
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
    ['no letters', 'Jane', '12345'],
  ])('rejects non-names (%s)', (_label, firstName, lastName) => {
    expect(parseName(firstName, lastName).success).toBe(false);
  });

  it('trims surrounding whitespace before validating', () => {
    const result = parseName('  Jane  ', ' Doe ');
    expect(result.success && result.data).toMatchObject({ firstName: 'Jane', lastName: 'Doe' });
  });
});
