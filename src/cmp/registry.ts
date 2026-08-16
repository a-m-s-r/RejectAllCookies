import { cookiebotAdapter } from './adapters/cookiebot';
import { oneTrustAdapter } from './adapters/onetrust';
import { didomiAdapter } from './adapters/didomi';
import { quantcastAdapter } from './adapters/quantcast';
import { cookieYesAdapter } from './adapters/cookieyes';
import { usercentricsAdapter } from './adapters/usercentrics';
import { sourcepointAdapter } from './adapters/sourcepoint';
import { googleFundingChoicesAdapter } from './adapters/google-funding-choices';
import { complianzAdapter } from './adapters/complianz';
import { iubendaAdapter } from './adapters/iubenda';
import type { CmpAdapter } from './types';

export const CMP_ADAPTERS: readonly CmpAdapter[] = [
  oneTrustAdapter,
  cookiebotAdapter,
  usercentricsAdapter,
  didomiAdapter,
  quantcastAdapter,
  cookieYesAdapter,
  sourcepointAdapter,
  googleFundingChoicesAdapter,
  complianzAdapter,
  iubendaAdapter,
];
