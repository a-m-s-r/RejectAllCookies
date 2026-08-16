export const PRIVACY_INVARIANT = 'NO_POSITIVE_CONSENT_WITHOUT_USER_ACTION' as const;

export type ActionIntent =
  | 'rejectAll'
  | 'openPreferences'
  | 'disablePurpose'
  | 'disableVendor'
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
}

export function assertSafeAction(action: ConsentAction): void {
  if (!action.evidence.length) throw new Error(`${PRIVACY_INVARIANT}: action has no semantic evidence`);
}
