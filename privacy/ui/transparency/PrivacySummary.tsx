export function PrivacySummary() {
  return <section className="privacy-summary" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Privacy</h1>
    <dl>
      <div><dt>Analytics</dt><dd>Not enabled.</dd></div>
      <div><dt>Theme</dt><dd>Your display preference stays in this browser.</dd></div>
      <div><dt>Guest workspace</dt><dd>Sample changes stay in this tab. Reset demo clears them.</dd></div>
      <div><dt>Hosting</dt><dd>Cloudflare can process connection metadata to serve and protect requests.</dd></div>
    </dl>
  </section>;
}
