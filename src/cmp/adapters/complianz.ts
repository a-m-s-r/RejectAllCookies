import { createSelectorAdapter } from './selector-adapter';

export const complianzAdapter = createSelectorAdapter({
  id: 'complianz',
  rootSelectors: ['.cmplz-cookiebanner'],
  rejectSelectors: ['button.cmplz-deny', '.cmplz-btn.cmplz-deny'],
  preferenceSelectors: ['button.cmplz-view-preferences', '.cmplz-link.cookie-statement'],
});
