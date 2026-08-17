import { createSelectorAdapter } from './selector-adapter';

export const cookieYesAdapter = createSelectorAdapter({
  id: 'cookieyes',
  rootSelectors: ['.cky-consent-container', '.cky-modal'],
  rejectSelectors: [
    'button[data-cky-tag="reject-button"]',
    'button[data-cky-tag="detail-reject-button"]',
    '.cky-btn-reject',
  ],
  preferenceSelectors: ['button[data-cky-tag="settings-button"]', '.cky-btn-customize'],
});
