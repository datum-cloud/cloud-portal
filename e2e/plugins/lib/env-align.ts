/**
 * Platform-alignment helper.
 *
 * The portal in dev talks to a REAL remote platform. datumctl may be logged
 * into a different environment than the portal's `.env` points at (e.g.
 * datumctl → api.datum.net while `.env` → api.staging.env.datum.net). A token
 * minted for one issuer will not validate against the other, so we detect the
 * mismatch and compute env overrides for the portal process we launch.
 *
 * Privacy: we read ONLY the API_URL and AUTH_OIDC_ISSUER lines from `.env` and
 * never surface the bearer token — only its (non-secret) `iss`/`aud` claims.
 */
import { REPO_ROOT } from './config';
import fs from 'node:fs';
import path from 'node:path';

export interface EnvAlignmentLines {
  apiUrl?: string;
  oidcIssuer?: string;
}

/**
 * Extract ONLY the API_URL and AUTH_OIDC_ISSUER assignments from `.env`.
 * Deliberately does not parse or return any other line.
 */
export function readEnvAlignmentLines(): EnvAlignmentLines {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const out: EnvAlignmentLines = {};
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    const api = line.match(/^API_URL=(.*)$/);
    if (api) out.apiUrl = stripQuotes(api[1]);
    const iss = line.match(/^AUTH_OIDC_ISSUER=(.*)$/);
    if (iss) out.oidcIssuer = stripQuotes(iss[1]);
  }
  return out;
}

function stripQuotes(v: string): string {
  return v.trim().replace(/^["']|["']$/g, '');
}

function hostOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).host;
  } catch {
    return undefined;
  }
}

/** Decode a JWT payload without verifying — used only to read `iss`/`aud`. */
export function decodeJwtClaims(token: string): { iss?: string; aud?: string | string[] } {
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const claims = JSON.parse(json);
    return { iss: claims.iss, aud: claims.aud };
  } catch {
    return {};
  }
}

export interface AlignmentResult {
  aligned: boolean;
  /** Overrides to apply to the launched portal process; empty when aligned. */
  overrides: { API_URL?: string; AUTH_OIDC_ISSUER?: string };
  /** The API URL the launched portal will use (override or the .env value). */
  effectiveApiUrl?: string;
  /** Human-readable notes for the run report (no secrets). */
  notes: string[];
}

/**
 * Derive the platform API URL from the token's OIDC issuer. Datum uses the
 * convention `auth.<env>` ↔ `api.<env>` (auth.datum.net ↔ api.datum.net,
 * auth.staging.env.datum.net ↔ api.staging.env.datum.net). The token issuer is
 * authoritative — it is what the token actually validates against, unlike the
 * `datumctl whoami` endpoint, which can drift when multiple sessions/contexts
 * exist for the same account.
 */
export function apiUrlFromIssuer(tokenIssuer?: string): string | undefined {
  const host = hostOf(tokenIssuer);
  if (!host) return undefined;
  if (host.startsWith('auth.')) return `https://api.${host.slice('auth.'.length)}`;
  return undefined;
}

/**
 * Compute env overrides so the launched portal validates the datumctl token.
 * API_URL is derived from the TOKEN (its issuer), not from `datumctl whoami`,
 * because the token is the only reliable signal for which environment it is
 * valid against.
 */
export function computeAlignment(params: {
  envApiUrl?: string;
  envOidcIssuer?: string;
  datumctlEndpoint: string;
  tokenIssuer?: string;
}): AlignmentResult {
  const { envApiUrl, envOidcIssuer, datumctlEndpoint, tokenIssuer } = params;
  const notes: string[] = [];
  const overrides: { API_URL?: string; AUTH_OIDC_ISSUER?: string } = {};

  const envApiHost = hostOf(envApiUrl);
  const ctlApiHost = hostOf(datumctlEndpoint);
  const tokenApiUrl = apiUrlFromIssuer(tokenIssuer);
  const tokenApiHost = hostOf(tokenApiUrl);

  if (tokenApiHost && envApiHost !== tokenApiHost) {
    overrides.API_URL = tokenApiUrl;
    notes.push(
      `API_URL derived from token issuer → ${tokenApiUrl} (.env=${envApiHost ?? 'unset'}). ` +
        `Overriding so the token validates.`
    );
  } else {
    notes.push(`API_URL aligned with token env (${envApiHost ?? 'unknown'}).`);
  }

  if (ctlApiHost && tokenApiHost && ctlApiHost !== tokenApiHost) {
    notes.push(
      `Note: datumctl whoami endpoint (${ctlApiHost}) differs from the token's env ` +
        `(${tokenApiHost}); trusting the token. Project discovery uses the token's env.`
    );
  }

  if (tokenIssuer) {
    const envIssHost = hostOf(envOidcIssuer);
    const tokIssHost = hostOf(tokenIssuer);
    if (envIssHost !== tokIssHost) {
      overrides.AUTH_OIDC_ISSUER = tokenIssuer;
      notes.push(
        `AUTH_OIDC_ISSUER overridden to token iss=${tokenIssuer} (.env=${envIssHost ?? 'unset'}).`
      );
    } else {
      notes.push(`AUTH_OIDC_ISSUER aligned (${envIssHost ?? 'unknown'}).`);
    }
  }

  return {
    aligned: Object.keys(overrides).length === 0,
    overrides,
    effectiveApiUrl: overrides.API_URL ?? envApiUrl,
    notes,
  };
}
