import { beforeEach, describe, expect, it } from 'vitest';
import { discoverSurfaces } from '../../src/core/detection/surface';

describe('detection performance regression', () => {
  beforeEach(() => document.body.replaceChildren());

  it('scans a 10,000-element non-consent document within a bounded budget', () => {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 2_000; index += 1) {
      const section = document.createElement('section');
      section.innerHTML = `<h2>Article ${String(index)}</h2><p>Ordinary content</p><div><a href="#${String(index)}">Read more</a></div>`;
      fragment.append(section);
    }
    document.body.append(fragment);
    const startedAt = performance.now();
    const surfaces = discoverSurfaces(document);
    const elapsedMs = performance.now() - startedAt;
    expect(surfaces).toEqual([]);
    expect(elapsedMs).toBeLessThan(3_000);
  });
});
