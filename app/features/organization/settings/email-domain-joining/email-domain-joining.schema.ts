import type { AppError } from '@/utils/errors/app-error';
import { toStringArray } from '@/utils/helpers/form-value.helper';
import { z } from 'zod';

/** Milo's limits on `spec.emailDomainJoining.domains`. */
export const MAX_EMAIL_DOMAINS = 10;

export const emailDomainJoiningFormSchema = z.object({
  // The form adapter serializes arrays as JSON strings; un-stringify first.
  domains: z
    .unknown()
    .transform(toStringArray)
    .pipe(
      z
        .array(z.string())
        .min(1, { message: 'Choose at least one domain' })
        .max(MAX_EMAIL_DOMAINS, { message: `Choose at most ${MAX_EMAIL_DOMAINS} domains` })
    ),
  role: z.string({ error: 'Role is required.' }).min(1, { message: 'Role is required.' }),
  roleNamespace: z.string().optional(),
});

export type EmailDomainJoiningFormValues = z.infer<typeof emailDomainJoiningFormSchema>;

/**
 * Milo's webhook explains each rejected domain in a field-level cause, such as
 * a public email provider or a domain no project has verified. Show those
 * explanations rather than the whole Kubernetes message.
 */
export function emailDomainJoiningErrorMessage(error: Error): string {
  const messages = ((error as AppError).details ?? [])
    .map((detail) => causeMessage(detail.message))
    .filter(Boolean);
  if (messages.length > 0) {
    return [...new Set(messages)].join(' ');
  }
  return error.message || 'Failed to save email domain joining';
}

/**
 * A cause reads like `Invalid value: ["gmail.com"]: gmail.com is a public…`.
 * Keep the explanation after the last ": ", and capitalize it unless it starts
 * with a domain, which stays as typed.
 */
function causeMessage(raw: string): string {
  const explanation = raw.slice(raw.lastIndexOf(': ') + 1).trim();
  const [firstWord = ''] = explanation.split(' ');
  if (firstWord.includes('.')) {
    return explanation;
  }
  return explanation.charAt(0).toUpperCase() + explanation.slice(1);
}
