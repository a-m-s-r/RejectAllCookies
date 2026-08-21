import type { EngineResult } from '../cmp/types';
import { CMP_ADAPTERS } from '../cmp/registry';
import { discoverSurfaces } from '../core/detection/surface';
import type { ConsentAction } from '../core/domain';
import { executeAction } from '../core/execution/execute';
import { planFirstAction, planPreferenceAction } from '../core/planning/planner';
import { VendorWalker, type VendorCoverage } from '../core/vendors/walker';

export interface InteractionPlan {
  readonly action: ConsentAction;
  readonly adapter?: string;
  readonly confidence: number;
  readonly dedicated: boolean;
  readonly vendorCoverage?: VendorCoverage;
}

export type Inspection = InteractionPlan | EngineResult;

export function isInteractionPlan(inspection: Inspection): inspection is InteractionPlan {
  return 'action' in inspection;
}

function isProgressAction(action: ConsentAction): boolean {
  return [
    'openPreferences',
    'disablePurpose',
    'disableVendor',
    'objectLegitimateInterest',
    'advanceVendorList',
  ].includes(action.intent);
}

export class ConsentEngine {
  private preferencesOpened = false;
  private privacyModified = false;
  private readonly performedTargets = new Set<Element>();
  private readonly vendorWalker = new VendorWalker();

  private planPreferences(
    surface: Parameters<typeof planPreferenceAction>[0],
    adapter?: (typeof CMP_ADAPTERS)[number],
  ): ConsentAction | null {
    const planner = adapter?.planPreferences
      ? (allowSave: boolean) =>
          adapter.planPreferences?.(surface, allowSave, this.performedTargets) ?? null
      : (allowSave: boolean) => planPreferenceAction(surface, allowSave, this.performedTargets);
    const privacyAction = planner(false);
    if (privacyAction) return privacyAction;
    const vendorAdvance = this.vendorWalker.nextAction(surface);
    if (vendorAdvance) return vendorAdvance;
    return planner(this.privacyModified && this.vendorWalker.allowsSave(surface));
  }

  inspect(doc: Document = document): Inspection {
    for (const adapter of CMP_ADAPTERS) {
      const surface = adapter.detect(doc);
      if (!surface) continue;
      const action =
        (this.preferencesOpened ? this.planPreferences(surface, adapter) : null) ??
        adapter.plan(surface);
      const repeatable = action?.intent === 'advanceVendorList';
      const freshAction =
        action && (repeatable || !this.performedTargets.has(action.target)) ? action : null;
      if (!freshAction) {
        return {
          status: 'unsupported',
          reason: 'Known CMP has no safe available action',
          adapter: adapter.id,
          actions: [],
          confidence: surface.confidence,
        };
      }
      return {
        action: freshAction,
        adapter: adapter.id,
        confidence: surface.confidence,
        dedicated: true,
        ...(freshAction.intent === 'savePreferences'
          ? { vendorCoverage: this.vendorWalker.coverage(surface) }
          : {}),
      };
    }

    const surface = discoverSurfaces(doc)[0];
    if (!surface) {
      if (this.preferencesOpened) {
        return {
          status: 'unsupported',
          reason: 'Preferences were opened, but complete minimization could not be proven',
          actions: [],
        };
      }
      return {
        status: 'not_detected',
        reason: 'No sufficiently confident consent surface',
        actions: [],
      };
    }
    const action =
      (this.preferencesOpened ? this.planPreferences(surface) : null) ??
      planFirstAction(surface, this.performedTargets);
    if (!action) {
      return {
        status: 'unsupported',
        reason: 'No semantically safe action found',
        actions: [],
        confidence: surface.confidence,
      };
    }
    return {
      action,
      confidence: surface.confidence,
      dedicated: false,
      ...(action.intent === 'savePreferences'
        ? { vendorCoverage: this.vendorWalker.coverage(surface) }
        : {}),
    };
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
    if (action.intent !== 'advanceVendorList') this.performedTargets.add(action.target);

    if (action.intent === 'openPreferences') this.preferencesOpened = true;
    if (
      action.intent === 'disablePurpose' ||
      action.intent === 'disableVendor' ||
      action.intent === 'objectLegitimateInterest'
    ) {
      this.preferencesOpened = true;
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
        ? verification.reason
        : action.intent === 'savePreferences'
          ? 'Privacy-preserving preferences saved; persistence not proven'
          : (verification?.reason ?? 'Safe rejection executed; persistence not proven'),
      ...adapterMetadata,
      actions: [action.intent],
      confidence: plan.confidence,
      ...(action.intent === 'savePreferences' && plan.vendorCoverage
        ? { details: { vendorCoverage: plan.vendorCoverage } }
        : {}),
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
