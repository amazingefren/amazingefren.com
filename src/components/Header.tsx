import React from "react";
import "../assets/Header.scss";
import { StaticImage } from "gatsby-plugin-image";

const Intro: React.FC = () => {
  return (
    <div>
      <div className="section-root" id="header-root">
        <div id="intro-container" className="section-container">
          <div id="intro-header">AmazingEfren ≝&nbsp;</div>
          <div id="intro-animation-container">
            <span id="intro-anim-1" className="iao">
              Developer
            </span>
          </div>
        </div>
      </div>
      <div id="intro-footer-root" className="section-root">
        <div id="intro-footer-container" className="section-container">
          <a
            className="intro-footer-link"
            href="https://github.com/amazingefren"
          >
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
    </div>
  );
};

export default Intro;
