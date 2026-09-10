export function AboutProfile() {
  return (
    <article className="about-profile" aria-labelledby="about-name">
      <header className="about-identity">
        <p className="eyebrow">ABOUT ME</p>
        <h1 id="about-name">Efren <em>Castro.</em></h1>
        <p className="about-role">Hands-on solutions architect.</p>
        <dl className="about-details">
          <div><dt>Based in</dt><dd>Denver, Colorado</dd></div>
          <div><dt>Languages</dt><dd>English + Spanish</dd></div>
        </dl>
      </header>
      <div className="about-body">
        <p className="about-bio">My work connects business needs to technical direction and hands-on implementation across applied AI, product architecture, software engineering, cloud infrastructure, and production operations.</p>
        <section className="about-resume" id="resume" aria-labelledby="resume-title">
          <div className="about-section-heading"><h2 id="resume-title">Resume</h2><span className="eyebrow">DOWNLOAD</span></div>
          <div className="about-downloads">
            <a href="/resume/Efren_Castro_Flagship_Resume.pdf" download><span><strong>PDF</strong><small>Ready to read</small></span><span aria-hidden="true">↓</span></a>
            <a href="/resume/Efren_Castro_Flagship_Resume.docx" download><span><strong>Word</strong><small>.docx</small></span><span aria-hidden="true">↓</span></a>
            <a href="/resume/Efren_Castro_Flagship_Resume.tex" download><span><strong>LaTeX</strong><small>.tex</small></span><span aria-hidden="true">↓</span></a>
          </div>
        </section>
        <section className="about-contact" aria-labelledby="contact-title">
          <h2 id="contact-title">Say hello</h2>
          <a href="mailto:dev@amazingefren.com">dev@amazingefren.com <span aria-hidden="true">↗</span></a>
        </section>
      </div>
    </article>
  );
}
