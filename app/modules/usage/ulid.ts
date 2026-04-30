// app/modules/usage/ulid.ts
//
// Minimal ULID generator (Crockford base32, 26 chars: 10 timestamp + 16
// randomness). The v0 ingestion gateway requires `eventID` to parse as a
// ULID — see usage-pipeline enhancement.
//
// We intentionally implement this inline rather than pull a dep: ULIDs
// are tiny and our usage is leaf-only. Lexicographic ordering and
// monotonicity-within-the-same-millisecond are not required for our
// emit path (each event is independent), so the simpler form is fine.

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
const TIME_LEN = 10;
const RAND_LEN = 16;

function encodeTime(now: number): string {
  let out = '';
  let t = now;
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const mod = t % 32;
    out = ENCODING[mod] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(rand: Uint8Array): string {
  let out = '';
  // 16 base32 chars at 5 bits = 80 bits of randomness.
  let bitBuf = 0;
  let bitCount = 0;
  let i = 0;
  while (out.length < RAND_LEN) {
    if (bitCount < 5) {
      bitBuf = (bitBuf << 8) | rand[i++]!;
      bitCount += 8;
    }
    const idx = (bitBuf >> (bitCount - 5)) & 0x1f;
    bitCount -= 5;
    out += ENCODING[idx];
  }
  return out;
}

/**
 * Generate a 26-character ULID. Uses `crypto.getRandomValues` when
 * available (Node 19+, Bun, browsers); falls back to `Math.random`.
 */
export function ulid(now: number = Date.now()): string {
  const rand = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < rand.length; i++) rand[i] = Math.floor(Math.random() * 256);
  }
  return encodeTime(now) + encodeRandom(rand);
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isUlid(value: string): boolean {
  return ULID_RE.test(value);
}
