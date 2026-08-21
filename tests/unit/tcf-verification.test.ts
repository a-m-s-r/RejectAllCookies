import { describe, expect, it } from 'vitest';
import { verifyTcfData, verifyTcfViaPostMessage } from '../../src/core/verification/tcf';

const rejected = {
  tcString: 'test-evidence',
  cmpStatus: 'loaded',
  eventStatus: 'useractioncomplete',
  gdprApplies: true,
  purposeOneTreatment: false,
  purpose: { consents: { 1: false, 2: false }, legitimateInterests: { 2: false } },
  vendor: { consents: { 10: false }, legitimateInterests: { 10: false } },
  specialFeatureOptins: { 1: false },
  publisher: {
    consents: { 1: false },
    legitimateInterests: { 2: false },
    customPurpose: { consents: { 1: false }, legitimateInterests: { 1: false } },
  },
};

describe('TCF read-only verification', () => {
  it('verifies complete all-false processing evidence', () => {
    expect(verifyTcfData(rejected).verified).toBe(true);
  });

  it.each([
    null,
    { ...rejected, cmpStatus: 'loading' },
    { ...rejected, eventStatus: 'cmpuishown' },
    { ...rejected, gdprApplies: false },
    { ...rejected, tcString: '' },
    { ...rejected, purposeOneTreatment: true },
    { ...rejected, purpose: { ...rejected.purpose, consents: { 1: true } } },
    { ...rejected, vendor: { ...rejected.vendor, legitimateInterests: { 10: true } } },
    {
      ...rejected,
      purpose: { consents: {}, legitimateInterests: {} },
      vendor: { consents: {}, legitimateInterests: {} },
      specialFeatureOptins: {},
    },
  ])('does not verify incomplete or active state', (value) => {
    expect(verifyTcfData(value).verified).toBe(false);
  });

  it('removes a registered TCF listener after successful verification', async () => {
    document.body.innerHTML = '<iframe name="__tcfapiLocator"></iframe>';
    const target = document.querySelector('iframe')?.contentWindow;
    if (!target) throw new Error('TCF locator fixture failed');
    const posted: unknown[] = [];
    target.postMessage = (message: unknown) => posted.push(message);
    const pending = verifyTcfViaPostMessage(window, 100);
    const call = posted[0] as { __tcfapiCall: { callId: string } };
    window.dispatchEvent(
      new MessageEvent('message', {
        source: target,
        data: {
          __tcfapiReturn: {
            callId: call.__tcfapiCall.callId,
            success: true,
            returnValue: { ...rejected, listenerId: 42 },
          },
        },
      }),
    );
    await expect(pending).resolves.toMatchObject({ verified: true });
    expect(posted).toHaveLength(2);
    expect(posted[1]).toMatchObject({
      __tcfapiCall: { command: 'removeEventListener', parameter: 42 },
    });
  });
});
