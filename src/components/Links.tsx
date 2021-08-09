import React from "react";
import { StaticImage } from "gatsby-plugin-image";
import TwitterSVG from "../images/Twitter.react.svg";
import LinkedinSVG from "../images/Linkedin.react.svg";
import GithubSVG from "../images/Github.react.svg";
import "../assets/Links.scss";

const Links = () => {
  return (
    <div id="links-root">
      <div className="link-item">
        <a
          className="intro-footer-link"
          href="https://github.com/amazingefren"
          target="_blank"
          id="github-container"
        >
          <div className="svg-wrapper">
            <GithubSVG />
          </div>
          <div id="github-name" className="link-content">
            amazingefren
          </div>
        </a>
      </div>

      <div className="link-item">
        <a
          className="intro-footer-link"
          href="https://linkedin.com/in/amazingefren"
          target="_blank"
          id="linkedin-container"
        >
          <div className="svg-wrapper">
            <LinkedinSVG id="linkedin-logo" />
          </div>
          <div id="github-name" className="link-content">
            amazingefren
          </div>
        </a>
      </div>
      <div className="link-item">
        <a
          className="intro-footer-link"
          href="https://twitter.com/amazingefren"
          target="_blank"
          id="twitter-container"
        >
          <div className="svg-wrapper">
            <TwitterSVG id="twitter-logo" />
          </div>
          <div id="github-name" className="link-content">
            amazingefren
          </div>
        </a>
      </div>
      <div className="link-item">
        <a
          className="intro-footer-link"
          href="https://linkedin.com/in/amazingefren"
          target="_blank"
        >
          <StaticImage
            src="../images/Email-Logo.png"
            alt="linkedin.com"
            width={50}
            height={50}
          />
        </a>
      </div>
    </div>
  );
};

export default Links;