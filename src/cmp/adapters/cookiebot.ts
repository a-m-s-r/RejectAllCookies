import { createSelectorAdapter } from './selector-adapter';

export const cookiebotAdapter = createSelectorAdapter({
  id: 'cookiebot',
  rootSelectors: ['#CybotCookiebotDialog'],
  rejectSelectors: ['#CybotCookiebotDialogBodyButtonDecline', '[data-cookiefirst-action="reject"]'],
  preferenceSelectors: ['#CybotCookiebotDialogBodyLevelButtonCustomize'],
});
