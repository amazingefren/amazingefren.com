import React, { useEffect, useState } from "react";
import TwitterSVG from "/images/Twitter.react.svg";
import LinkedinSVG from "/images/Linkedin.react.svg";
import GithubSVG from "/images/Github.react.svg";
import EmailSVG from "/images/Email.react.svg";
import "../assets/Contact.scss";

const Contact = () => {
  const [enabled, setEnabled] = useState(false);
  const [emailCopy, setEmailCopy] = useState("copy");
  const copy = (name: string) => {
    navigator.clipboard.writeText(name);
    setEmailCopy("copied ✓");
  };
  useEffect(() => {
    setEnabled(true);
  }, []);
  return (
    <div className="section-root" id="contact-root">
      <div className="section-container" id="contact-container">
        <div id="contact-item-container">
          <div className="contact-item" id="contact-email">
            <div id="contact-email-flex">
              <a
                href="mailto:contact@amazingefren.com"
                id="contact-email"
                className="contact-item-flex"
              >
                <EmailSVG />
                <h3>contact@amazingefren.com</h3>
              </a>
              {enabled && (
                <button
                  className={
                    emailCopy != "copy"
                      ? "contact-item-copied"
                      : "contact-item-copy"
                  }
                  onClick={() => copy("contact@amazingefren.com")}
                >
                  {emailCopy}
                </button>
              )}
            </div>
          </div>
          <div className="contact-item" id="contact-github">
            <a
              className="contact-item-flex"
              href="https://github.com/amazingefren"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubSVG />
              <h3>amazingefren</h3>
            </a>
          </div>
          <div className="contact-item" id="contact-linkedin">
            <a
              className="contact-item-flex"
              href="https://linkedin.com/in/amazingefren"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkedinSVG />
              <h3>/in/amazingefren</h3>
            </a>
          </div>
          <div id="contact-twitter" className="contact-item">
            <a
              className="contact-item-flex"
              href="https://twitter.com/amazingefren"
              target="_blank"
              rel="noopener noreferrer"
            >
              <TwitterSVG />
              <h3>amazingefren</h3>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
