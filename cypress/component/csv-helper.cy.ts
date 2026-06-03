import { escapeCsvField, parseCsvLine, toCsv } from '@/utils/helpers/csv.helper';

describe('escapeCsvField', () => {
  it('returns a plain value unchanged', () => {
    expect(escapeCsvField('example.com')).to.equal('example.com');
  });
  it('quotes a value containing a comma', () => {
    expect(escapeCsvField('GoDaddy.com, LLC')).to.equal('"GoDaddy.com, LLC"');
  });
  it('quotes and doubles internal double-quotes', () => {
    expect(escapeCsvField('a "b" c')).to.equal('"a ""b"" c"');
  });
  it('quotes a value containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).to.equal('"line1\nline2"');
  });
  it('quotes a value containing a carriage return', () => {
    expect(escapeCsvField('a\rb')).to.equal('"a\rb"');
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
    expect(csv).to.equal('A,B\n1,2\n3,4');
  });
  it('escapes fields per cell', () => {
    const csv = toCsv(['Name'], [['x, y']]);
    expect(csv).to.equal('Name\n"x, y"');
  });
  it('returns just the header when there are no rows', () => {
    expect(toCsv(['A', 'B'], [])).to.equal('A,B');
  });
});

describe('parseCsvLine', () => {
  it('splits plain fields on commas', () => {
    expect(parseCsvLine('a,b,c')).to.deep.equal(['a', 'b', 'c']);
  });
  it('keeps commas inside quoted fields', () => {
    expect(parseCsvLine('example.com,"GoDaddy.com, LLC",x')).to.deep.equal([
      'example.com',
      'GoDaddy.com, LLC',
      'x',
    ]);
  });
  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsvLine('"a ""b"" c"')).to.deep.equal(['a "b" c']);
  });
  it('preserves a trailing empty field', () => {
    expect(parseCsvLine('a,')).to.deep.equal(['a', '']);
  });
});
