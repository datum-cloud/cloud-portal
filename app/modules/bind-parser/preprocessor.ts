/**
 * BIND Zone File Preprocessor
 * Handles comment removal, multiline record collapsing, and directive extraction
 */
import type { PreprocessResult } from './types';

/**
 * Check if a semicolon is inside a quoted string
 */
function isSemicolonInsideQuotes(line: string, semicolonIndex: number): boolean {
  let inQuotes = false;
  for (let i = 0; i < semicolonIndex; i++) {
    if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    }
  }
  return inQuotes;
}

/**
 * Remove comments from a line while preserving semicolons inside quoted strings
 */
function stripComment(line: string): string {
  let i = 0;
  while (i < line.length) {
    const semicolonIndex = line.indexOf(';', i);
    if (semicolonIndex === -1) {
      return line;
    }
    if (!isSemicolonInsideQuotes(line, semicolonIndex)) {
      return line.substring(0, semicolonIndex);
    }
    i = semicolonIndex + 1;
  }
  return line;
}

/**
 * Collapse multiline records (parentheses continuation) into single lines
 * RFC 1035: Parentheses allow data to span multiple lines
 *
 * Handles formats:
 * 1. Opening paren on same line: "@ IN SOA ns1.example.com. admin.example.com. ("
 * 2. Opening paren on separate line after continuation:
 *    "@ IN SOA ns1.example.com."
 *    "admin.example.com."
 *    "("
 *    "..."
 */
function collapseMultilineRecords(lines: string[]): string[] {
  const result: string[] = [];
  let buffer = '';
  let inParentheses = false;
  let pendingLines: string[] = []; // Lines before we hit a standalone (

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    if (!inParentheses) {
      const openParen = trimmedLine.indexOf('(');
      const closeParen = trimmedLine.indexOf(')');

      // Check if line is just "(" - indicates previous lines are part of this record
      if (trimmedLine === '(') {
        // Start parentheses mode, buffer includes pending lines
        inParentheses = true;
        buffer = pendingLines.join(' ');
        pendingLines = [];
        continue;
      }

      if (openParen !== -1 && (closeParen === -1 || closeParen < openParen)) {
        // Opening parenthesis found on this line, start buffering
        inParentheses = true;
        // Include any pending lines plus this line (minus the paren)
        const beforeParen = trimmedLine.substring(0, openParen);
        const afterParen = trimmedLine.substring(openParen + 1);
        buffer = [...pendingLines, beforeParen, afterParen].join(' ');
        pendingLines = [];
      } else if (openParen !== -1 && closeParen > openParen) {
        // Both open and close on same line - single line with parens
        const allLines = [...pendingLines, trimmedLine];
        const collapsed = allLines.join(' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (collapsed) {
          result.push(collapsed);
        }
        pendingLines = [];
      } else {
        // Regular line - could be start of multiline or standalone
        // Check if next non-empty line is "(" or contains "("
        const nextIdx = findNextNonEmptyLine(lines, i + 1);
        const nextLine = nextIdx !== -1 ? lines[nextIdx].trim() : '';

        if (nextLine === '(' || (nextLine.includes('(') && !nextLine.includes(')'))) {
          // This line is part of a multiline record, add to pending
          pendingLines.push(trimmedLine);
        } else if (pendingLines.length > 0) {
          // We have pending lines but next isn't a paren - flush pending + this line
          // This handles continuation without parens (like rname after SOA)
          const looksLikeContinuation = !trimmedLine.match(/^\S+\s+(\d+\s+)?(IN\s+)?[A-Z]+\s/i);
          if (looksLikeContinuation) {
            pendingLines.push(trimmedLine);
          } else {
            // Flush pending as separate lines (they weren't actually multiline)
            pendingLines.forEach((pl) => result.push(pl));
            pendingLines = [trimmedLine];
          }
        } else {
          // Check if this looks like a complete record or continuation
          const looksLikeNewRecord = trimmedLine.match(/^\S+\s+(\d+\s+)?(IN\s+)?[A-Z]+\s/i);
          if (looksLikeNewRecord || trimmedLine.startsWith('$')) {
            // Complete record or directive
            pendingLines = [trimmedLine];
          } else if (pendingLines.length > 0) {
            // Continuation of previous
            pendingLines.push(trimmedLine);
          } else {
            // Start fresh
            pendingLines = [trimmedLine];
          }
        }
      }
    } else {
      // Inside parentheses - accumulate content
      const closeParen = trimmedLine.indexOf(')');

      if (closeParen !== -1) {
        // Found closing parenthesis
        buffer += ' ' + trimmedLine.substring(0, closeParen);
        inParentheses = false;

        // Collapse whitespace and add to result
        const collapsed = buffer.replace(/\s+/g, ' ').trim();
        if (collapsed) {
          result.push(collapsed);
        }
        buffer = '';

        // Check if there's content after the closing paren (rare but possible)
        const afterParen = trimmedLine.substring(closeParen + 1).trim();
        if (afterParen) {
          pendingLines = [afterParen];
        }
      } else {
        // Continue accumulating
        buffer += ' ' + trimmedLine;
      }
    }
  }

  // Flush any remaining pending lines
  if (pendingLines.length > 0) {
    const combined = pendingLines.join(' ').replace(/\s+/g, ' ').trim();
    if (combined) {
      result.push(combined);
    }
  }

  // Handle unclosed parentheses (malformed file)
  if (buffer.trim()) {
    result.push(buffer.replace(/\s+/g, ' ').trim());
  }

  return result;
}

/**
 * Find next non-empty line index
 */
function findNextNonEmptyLine(lines: string[], startIdx: number): number {
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].trim()) {
      return i;
    }
  }
  return -1;
}

/**
 * Extract $ORIGIN directive from lines
 */
function extractOrigin(lines: string[]): { origin: string | null; remainingLines: string[] } {
  let origin: string | null = null;
  const remainingLines: string[] = [];

  for (const line of lines) {
    const originMatch = line.match(/^\$ORIGIN\s+(\S+)/i);
    if (originMatch) {
      // Remove trailing dot for consistency
      origin = originMatch[1].replace(/\.$/, '');
    } else {
      remainingLines.push(line);
    }
  }

  return { origin, remainingLines };
}

/**
 * Extract $TTL directive from lines
 */
function extractDefaultTTL(lines: string[]): {
  defaultTTL: number | null;
  remainingLines: string[];
} {
  let defaultTTL: number | null = null;
  const remainingLines: string[] = [];

  for (const line of lines) {
    const ttlMatch = line.match(/^\$TTL\s+(\d+)/i);
    if (ttlMatch) {
      defaultTTL = parseInt(ttlMatch[1], 10);
    } else {
      remainingLines.push(line);
    }
  }

  return { defaultTTL, remainingLines };
}

/**
 * Preprocess a BIND zone file
 * 1. Remove comments
 * 2. Collapse multiline records
 * 3. Extract directives ($ORIGIN, $TTL)
 */
export function preprocessZoneFile(content: string): PreprocessResult {
  // Split into lines
  let lines = content.split('\n');

  // Strip comments from each line
  lines = lines.map(stripComment);

  // Filter out empty lines for multiline detection, but keep for processing
  const nonEmptyLines = lines.filter((line) => line.trim() !== '');

  // Collapse multiline records (parentheses)
  lines = collapseMultilineRecords(nonEmptyLines);

  // Extract $ORIGIN
  const { origin, remainingLines: afterOrigin } = extractOrigin(lines);

  // Extract $TTL
  const { defaultTTL, remainingLines: finalLines } = extractDefaultTTL(afterOrigin);

  return {
    lines: finalLines,
    origin,
    defaultTTL,
  };
}
