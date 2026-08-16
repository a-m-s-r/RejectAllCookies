export const PRIVACY_INVARIANT = 'NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION' as const;

export type ActionIntent =
  | 'rejectAll'
  | 'openPreferences'
  | 'disablePurpose'
  | 'disableVendor'
  | 'advanceVendorList'
  | 'objectLegitimateInterest'
  | 'savePreferences'
  | 'dismissAfterReject';

export type UnsafeIntent = 'acceptAll' | 'enableOptional' | 'consentAll';

export interface ConsentAction {
  readonly intent: ActionIntent;
  readonly target: Element;
  readonly evidence: readonly string[];
}

export type OutcomeStatus =
  | 'rejected_verified'
  | 'rejected_unverified'
  | 'hidden_after_rejection'
  | 'hidden_only'
  | 'not_detected'
  | 'unsupported'
  | 'interaction_failed';

export interface Outcome {
  readonly status: OutcomeStatus;
  readonly reason: string;
  readonly adapter?: string;
  readonly actions: readonly ActionIntent[];
  readonly details?: OutcomeDetails;
}

export interface OutcomeDetails {
  readonly vendorCoverage?: 'not_present' | 'ui_traversal_complete' | 'incomplete' | 'unverified';
}

const SAFE_AUTOMATIC_INTENTS: ReadonlySet<string> = new Set<ActionIntent>([
  'rejectAll',
  'openPreferences',
  'disablePurpose',
  'disableVendor',
  'advanceVendorList',
  'objectLegitimateInterest',
  'savePreferences',
  'dismissAfterReject',
]);

export function assertSafeAction(action: ConsentAction): void {
  if (!SAFE_AUTOMATIC_INTENTS.has(action.intent)) {
    throw new Error(`${PRIVACY_INVARIANT}: unsafe automatic intent ${String(action.intent)}`);
  }
  if (!action.evidence.length)
    throw new Error(`${PRIVACY_INVARIANT}: action has no semantic evidence`);
}
