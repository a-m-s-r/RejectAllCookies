import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Minimum Consent',
    description: 'Locally selects the most privacy-preserving consent choice available.',
    permissions: ['storage', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'Minimum Consent' },
    browser_specific_settings: {
      gecko: {
        id: 'minimum-consent@example.invalid',
        strict_min_version: '128.0',
      },
    },
  },
});
