import React from "react";
import { StaticImage } from "gatsby-plugin-image";

const Links = () => {
  return (
    <div id="intro-footer-root" className="section-root">
      <div id="intro-footer-container" className="section-container">
        <a className="intro-footer-link" href="https://github.com/amazingefren">
          <StaticImage
            src="../images/Github-Logo.png"
            alt="github.com"
            width={32}
            height={32}
          />
          <span>github.com/amazingefren</span>
        </a>
        <a
          className="intro-footer-link"
          href="https://linkedin.com/in/amazingefren"
        >
          <StaticImage
            src="../images/Linkedin-Logo.png"
            alt="linkedin.com"
            width={32}
            height={32}
          />
          <span>linkedin.com/in/amazingefren</span>
        </a>
        <a
          className="intro-footer-link"
          href="https://twitter.com/amazingefren"
        >
          <StaticImage
            src="../images/Twitter-Logo.png"
            alt="twitter.com"
            width={32}
            height={32}
          />
          <span>twitter.com/amazingefren</span>
        </a>
        <a
          className="intro-footer-link"
          href="https://linkedin.com/in/amazingefren"
        >
          <StaticImage
            src="../images/Email-Logo.png"
            alt="linkedin.com"
            width={32}
            height={32}
          />
          <span>efrencastro.dev@gmail.com</span>
        </a>
      </div>
    </div>
  );
};

export default Links
