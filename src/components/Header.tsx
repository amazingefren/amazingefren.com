import React from "react";
import "../assets/Header.scss";
import { StaticImage } from "gatsby-plugin-image";

const Intro: React.FC = () => {
  return (
    <div className="section-root">
      <div id="intro-container" className="section-container">
        <div id="intro-header">AmazingEfren ≝&nbsp;</div>
        <div id="intro-animation-container">
          <span id="intro-anim-1" className="iao">
            Developer
          </span>
        </div>
        <div id="intro-footer">
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
            <span>amazingefren</span>
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
            <span>amazingefren</span>
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

          <a
            className="intro-footer-link"
            href="https://linkedin.com/in/amazingefren"
          >
            <StaticImage
              src="../images/Twitter-Logo.png"
              alt="linkedin.com"
              width={32}
              height={32}
            />
            <span>amazingefren</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Intro;
