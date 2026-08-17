import { createSelectorAdapter } from './selector-adapter';

export const iubendaAdapter = createSelectorAdapter({
  id: 'iubenda',
  rootSelectors: ['#iubenda-cs-banner', '.iubenda-cs-container'],
  rejectSelectors: ['button.iubenda-cs-reject-btn', '.iubenda-cs-reject-btn'],
  preferenceSelectors: ['button.iubenda-cs-customize-btn', '.iubenda-cs-customize-btn'],
});
