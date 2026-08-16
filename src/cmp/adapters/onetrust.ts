import { createSelectorAdapter } from './selector-adapter';

export const oneTrustAdapter = createSelectorAdapter({
  id: 'onetrust',
  rootSelectors: ['#onetrust-banner-sdk', '#onetrust-pc-sdk'],
  rejectSelectors: ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler'],
  preferenceSelectors: ['#onetrust-pc-btn-handler'],
});
