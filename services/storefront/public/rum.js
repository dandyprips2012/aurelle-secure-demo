// Datadog Browser RUM for the storefront. The SDK itself is loaded from Datadog's CDN in index.html;
// the application ID and client token (both public, browser-side values) come from rum-config.js.
// Requests to this site's own API carry trace headers, so every browser click that calls the API
// continues into one trace: aurelle-web -> aurelle-storefront -> inventory/payments -> Postgres.
(() => {
  const cfg = window.AURELLE_RUM;
  if (!cfg || !cfg.applicationId || !cfg.clientToken || !window.DD_RUM) return;

  window.DD_RUM.init({
    applicationId: cfg.applicationId,
    clientToken: cfg.clientToken,
    site: cfg.site || "datadoghq.com",
    service: "aurelle-web",
    env: "demo",
    version: "1.0.0",
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
    allowUntrustedEvents: true, // lets the built-in UI traffic driver (ui-driver.js) show up as user actions
    allowedTracingUrls: [{ match: window.location.origin, propagatorTypes: ["datadog", "tracecontext"] }],
  });

  // Same marker the backend services carry as the tag app:aurelle. RUM has no free-form tags, so on RUM events it
  // is a context attribute: filter with @context.app:aurelle.
  window.DD_RUM.setGlobalContextProperty("app", "aurelle");
})();
