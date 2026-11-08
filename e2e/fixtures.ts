import { test as base, expect } from '@playwright/test';
export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [async ({ page, baseURL }, use, testInfo) => {
    const errors: string[] = [];
    const aborted: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => {
      // A deliberate route change can cancel an obsolete request. All other
      // resource failures, including fonts and lazy chunks, must fail the gate.
      const error = request.failure()?.errorText ?? 'unknown request failure';
      if (error === 'net::ERR_ABORTED') aborted.push(request.url());
      else errors.push(`${error}: ${request.url()}`);
    });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    page.on('request', request => {
      if (new URL(request.url()).origin !== new URL(baseURL ?? 'http://127.0.0.1:3000').origin) errors.push(`Unexpected external request: ${request.url()}`);
    });
    page.on('framenavigated', frame => {
      if (frame !== page.mainFrame() || frame.url() === 'about:blank') return;
      if (new URL(frame.url()).origin !== new URL(baseURL ?? 'http://127.0.0.1:3000').origin) errors.push(`Unexpected navigation: ${frame.url()}`);
    });
    await use();
    if (aborted.length) await testInfo.attach('navigation-cancelled-requests', { body: JSON.stringify(aborted), contentType: 'application/json' });
    expect(errors, 'No browser runtime or console errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
