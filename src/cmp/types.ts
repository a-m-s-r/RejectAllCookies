import type { ConsentAction, Outcome } from '../core/domain';
import type { ConsentSurface } from '../core/detection/surface';

export interface CmpAdapter {
  readonly id: string;
  detect(document: Document): ConsentSurface | null;
  plan(surface: ConsentSurface): ConsentAction | null;
  planPreferences?(
    surface: ConsentSurface,
    allowSave: boolean,
    excluded: ReadonlySet<Element>,
  ): ConsentAction | null;
  verify(document: Document): VerificationResult;
}

export interface VerificationResult {
  readonly verified: boolean;
  readonly reason: string;
}

export interface EngineResult extends Outcome {
  readonly confidence?: number;
}
