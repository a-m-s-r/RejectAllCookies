const HOST_ATTRIBUTE = 'data-minimum-consent-sweep';

export interface SweepIndicator {
  readonly show: () => void;
  readonly hide: () => void;
}

export function createSweepIndicator(doc: Document): SweepIndicator {
  let host: HTMLDivElement | undefined;

  const hide = () => {
    host?.remove();
    host = undefined;
  };

  const show = () => {
    if (host?.isConnected) return;
    const parent = doc.documentElement;

    host = doc.createElement('div');
    host.setAttribute(HOST_ATTRIBUTE, 'active');
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute(
      'aria-label',
      'Minimum Consent is rejecting optional consent choices. Please wait before opening privacy settings.',
    );
    Object.assign(host.style, {
      all: 'initial',
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const card = doc.createElement('div');
    Object.assign(card.style, {
      boxSizing: 'border-box',
      width: 'min(320px, calc(100vw - 32px))',
      padding: '12px 14px',
      border: '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: '10px',
      background: '#17202a',
      boxShadow: '0 8px 28px rgba(0, 0, 0, 0.3)',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '13px',
      lineHeight: '1.4',
    });

    const heading = doc.createElement('div');
    heading.textContent = 'Minimum Consent is working';
    Object.assign(heading.style, {
      marginBottom: '3px',
      fontSize: '14px',
      fontWeight: '650',
    });

    const detail = doc.createElement('div');
    detail.textContent =
      'Rejecting optional consent choices. Please wait before opening privacy settings.';
    Object.assign(detail.style, { color: '#d5dde5' });

    card.append(heading, detail);
    shadow.append(card);
    parent.append(host);
  };

  return { show, hide };
}
