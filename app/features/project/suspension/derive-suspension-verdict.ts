import {
  projectSuspensionInfoSchema,
  type ProjectSuspensionInfo,
  type ProjectSuspensionReason,
} from '@/resources/projects/project.schema';

export interface SuspensionVerdict {
  /** True ONLY on an explicit `Suspended` condition with status 'True'. */
  isSuspended: boolean;
  /** Validated entries from status.suspensions[] (active-only today: lift = delete upstream). */
  suspensions: ProjectSuspensionInfo[];
  /** Distinct reason categories, in status order. */
  reasons: ProjectSuspensionReason[];
  /** Every suspension is consumer-remediable (Billing). Mixed authorities → false. */
  canSelfRemediate: boolean;
}

/**
 * Also the unknown verdict — no `Suspended` condition at all (feature gate off,
 * older API, missing status) is deliberately indistinguishable from a healthy
 * one to consumers: both mean "do not gate". Nothing needs to tell them apart.
 */
const NOT_SUSPENDED: SuspensionVerdict = {
  isSuspended: false,
  suspensions: [],
  reasons: [],
  canSelfRemediate: false,
};

/**
 * Single source of truth for consumer-facing suspension state. Call sites never
 * re-derive (spec: docs/superpowers/specs/2026-08-05-project-suspension-consumer-ui-design.md).
 *
 * Rules:
 * - `Suspended` condition polarity is INVERTED vs Ready: 'False' is the HEALTHY
 *   state (see project.watch.ts:80-84 for the shipped bug this once caused).
 * - Never derived from `Ready` — suspension deliberately never flips it.
 * - Never reads condition.message — it embeds internal suspension resource names.
 * - The condition is authoritative for WHETHER suspended; suspensions[] only
 *   enriches WHY. Unparseable entries are dropped individually, and any drop
 *   forces the conservative tier rather than silently narrowing the sample
 *   canSelfRemediate is computed over.
 * - NOT read via transformControlPlaneStatus: its auto-detect ignores Suspended,
 *   and its non-True branch folds condition.message into the output.
 */
export function deriveSuspensionVerdict(status: unknown): SuspensionVerdict {
  if (!status || typeof status !== 'object') return NOT_SUSPENDED;
  const conditions = (status as { conditions?: unknown }).conditions;
  if (!Array.isArray(conditions)) return NOT_SUSPENDED;

  const suspendedCondition = conditions.find(
    (c): c is { type: string; status: string } =>
      !!c && typeof c === 'object' && (c as { type?: unknown }).type === 'Suspended'
  );
  if (!suspendedCondition) return NOT_SUSPENDED;
  if (suspendedCondition.status !== 'True') return NOT_SUSPENDED;

  const rawEntries = (status as { suspensions?: unknown }).suspensions;
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const parsed = entries.map((entry) => projectSuspensionInfoSchema.safeParse(entry));
  const suspensions = parsed.flatMap((p) => (p.success ? [p.data] : []));
  const droppedEntry = suspensions.length !== parsed.length;
  const reasons = [...new Set(suspensions.map((s) => s.reason))];

  return {
    isSuspended: true,
    suspensions,
    reasons,
    // The tier drives a PROMISE ("settling the balance reinstates automatically"
    // vs "our team reviews appeals"), so a dropped entry must never be able to
    // flip it. Two failure modes this closes:
    //  - A lone entry carrying a reason milo added later used to fail
    //    `safeParse` outright, emptying suspensions[] and downgrading a billing
    //    suspension to "Appeal" — steering the user away from the payment that
    //    would actually lift it. `reason` now `.catch`es, so the entry and its
    //    authoritative `reinstateAuthority` survive.
    //  - An unparseable Operator entry sitting beside a valid Consumer one used
    //    to vanish, leaving `every()` trivially true and falsely promising
    //    automatic reinstatement. Any drop now forces the conservative tier.
    canSelfRemediate:
      !droppedEntry &&
      suspensions.length > 0 &&
      suspensions.every((s) => s.reinstateAuthority === 'Consumer'),
  };
}

/**
 * Earliest suspendedAt among the verdict's validated suspensions, or null when
 * no entry carries a parseable timestamp. Drives "Suspended since {date}".
 */
export function suspendedSince(verdict: SuspensionVerdict): Date | null {
  const times = verdict.suspensions
    .map((s) => new Date(s.suspendedAt).getTime())
    .filter((t) => Number.isFinite(t));
  return times.length > 0 ? new Date(Math.min(...times)) : null;
}
