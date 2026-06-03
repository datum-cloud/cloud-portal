import { escapeCsvField, parseCsvLine, toCsv } from './csv.helper';
import { describe, expect, it } from 'bun:test';

describe('escapeCsvField', () => {
  it('returns a plain value unchanged', () => {
    expect(escapeCsvField('example.com')).toBe('example.com');
  });
  it('quotes a value containing a comma', () => {
    expect(escapeCsvField('GoDaddy.com, LLC')).toBe('"GoDaddy.com, LLC"');
  });
  it('quotes and doubles internal double-quotes', () => {
    expect(escapeCsvField('a "b" c')).toBe('"a ""b"" c"');
  });
  it('quotes a value containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
  it('quotes a value containing a carriage return', () => {
    expect(escapeCsvField('a\rb')).toBe('"a\rb"');
  });
});

describe('toCsv', () => {
  it('emits the header row then data rows joined with LF', () => {
    const csv = toCsv(
      ['A', 'B'],
      [
        ['1', '2'],
        ['3', '4'],
      ]
    );
    expect(csv).toBe('A,B\n1,2\n3,4');
  });
  it('escapes fields per cell', () => {
    const csv = toCsv(['Name'], [['x, y']]);
    expect(csv).toBe('Name\n"x, y"');
  });
  it('returns just the header when there are no rows', () => {
    expect(toCsv(['A', 'B'], [])).toBe('A,B');
  });
});

describe('parseCsvLine', () => {
  it('splits plain fields on commas', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('keeps commas inside quoted fields', () => {
    expect(parseCsvLine('example.com,"GoDaddy.com, LLC",x')).toEqual([
      'example.com',
      'GoDaddy.com, LLC',
      'x',
    ]);
  });
  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsvLine('"a ""b"" c"')).toEqual(['a "b" c']);
  });
  it('preserves a trailing empty field', () => {
    expect(parseCsvLine('a,')).toEqual(['a', '']);
  });
});
