import type { EngineResult } from '../cmp/types';
import { CMP_ADAPTERS } from '../cmp/registry';
import { discoverSurfaces } from '../core/detection/surface';
import type { ConsentAction } from '../core/domain';
import { executeAction } from '../core/execution/execute';
import { planFirstAction, planPreferenceAction } from '../core/planning/planner';

export interface InteractionPlan {
  readonly action: ConsentAction;
  readonly adapter?: string;
  readonly confidence: number;
  readonly dedicated: boolean;
}

export type Inspection = InteractionPlan | EngineResult;

export function isInteractionPlan(inspection: Inspection): inspection is InteractionPlan {
  return 'action' in inspection;
}

function isProgressAction(action: ConsentAction): boolean {
  return ['openPreferences', 'disablePurpose', 'disableVendor', 'objectLegitimateInterest'].includes(
    action.intent,
  );
}

export class ConsentEngine {
  private preferencesOpened = false;
  private privacyModified = false;

  inspect(doc: Document = document): Inspection {
    for (const adapter of CMP_ADAPTERS) {
      const surface = adapter.detect(doc);
      if (!surface) continue;
      const action =
        (this.preferencesOpened
          ? planPreferenceAction(surface, this.privacyModified)
          : null) ?? adapter.plan(surface);
      if (!action) {
        return {
          status: 'unsupported',
          reason: 'Known CMP has no safe available action',
          adapter: adapter.id,
          actions: [],
          confidence: surface.confidence,
        };
      }
      return { action, adapter: adapter.id, confidence: surface.confidence, dedicated: true };
    }

    const surface = discoverSurfaces(doc)[0];
    if (!surface) {
      return {
        status: 'not_detected',
        reason: 'No sufficiently confident consent surface',
        actions: [],
      };
    }
    const action =
      (this.preferencesOpened
        ? planPreferenceAction(surface, this.privacyModified)
        : null) ?? planFirstAction(surface);
    if (!action) {
      return {
        status: 'unsupported',
        reason: 'No semantically safe action found',
        actions: [],
        confidence: surface.confidence,
      };
    }
    return { action, confidence: surface.confidence, dedicated: false };
  }

  execute(plan: InteractionPlan, doc: Document = document): EngineResult {
    const { action } = plan;
    const adapterMetadata = plan.adapter ? { adapter: plan.adapter } : {};
    if (!executeAction(action)) {
      return {
        status: 'interaction_failed',
        reason: 'Semantically safe action could not be executed',
        ...adapterMetadata,
        actions: [action.intent],
        confidence: plan.confidence,
      };
    }

    if (action.intent === 'openPreferences') this.preferencesOpened = true;
    if (
      action.intent === 'disablePurpose' ||
      action.intent === 'disableVendor' ||
      action.intent === 'objectLegitimateInterest'
    ) {
      this.privacyModified = true;
    }
    if (isProgressAction(action)) {
      return {
        status: 'unsupported',
        reason: 'Privacy workflow progressed; further safe action required',
        ...adapterMetadata,
        actions: [action.intent],
        confidence: plan.confidence,
      };
    }

    const adapter = plan.adapter
      ? CMP_ADAPTERS.find((candidate) => candidate.id === plan.adapter)
      : undefined;
    const verification = action.intent === 'rejectAll' ? adapter?.verify(doc) : undefined;
    const verified = verification?.verified === true;
    return {
      status: verified ? 'rejected_verified' : 'rejected_unverified',
      reason: verified
        ? 'Consent surface disappeared after rejection'
        : action.intent === 'savePreferences'
          ? 'Privacy-preserving preferences saved; persistence not proven'
          : verification?.reason ?? 'Safe rejection executed; persistence not proven',
      ...adapterMetadata,
      actions: [action.intent],
      confidence: plan.confidence,
    };
  }

  handle(doc: Document = document): EngineResult {
    const inspection = this.inspect(doc);
    return isInteractionPlan(inspection) ? this.execute(inspection, doc) : inspection;
  }
}

export function handleConsent(doc: Document = document): EngineResult {
  return new ConsentEngine().handle(doc);
}
