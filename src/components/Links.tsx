import React from "react";
import TwitterSVG from "/images/Twitter.react.svg";
import LinkedinSVG from "/images/Linkedin.react.svg";
import GithubSVG from "/images/Github.react.svg";
import EmailSVG from "/images/Email.react.svg";
import "../assets/Links.scss";

const Links = () => {
  return (
    <div id="links-root">
      <div className="link-item">
        <a
          className="intro-footer-link"
          href="mailto:contact@amazingefren.com"
          target="_blank"
          id="email-container"
          rel="noopener noreferrer"
        >
          <div className="svg-wrapper">
            <EmailSVG id="email-logo" />
          </div>
          <div id="email-name" className="link-content">
            contact@amazingefren.com
          </div>
        </a>
      </div>
      <div className="link-item">
        <a
          className="intro-footer-link"
          href="https://github.com/amazingefren"
          target="_blank"
          id="github-container"
          rel="noopener noreferrer"
        >
          <div className="svg-wrapper">
            <GithubSVG id="github-logo" />
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
          rel="noopener noreferrer"
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
          rel="noopener noreferrer"
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
        ></a>
      </div>
    </div>
  );
};

export default Links;
