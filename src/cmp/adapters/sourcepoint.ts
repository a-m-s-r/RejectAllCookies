import { createSelectorAdapter } from './selector-adapter';

export const sourcepointAdapter = createSelectorAdapter({
  id: 'sourcepoint',
  rootSelectors: ['.message-component', '[data-testid="sp-message-container"]'],
  rejectSelectors: ['button.sp_choice_type_REJECT_ALL', 'button[data-testid="reject-all"]'],
  preferenceSelectors: [
    'button.sp_choice_type_12[title$="Settings"]',
    'button[aria-label="More Options"]',
  ],
});
