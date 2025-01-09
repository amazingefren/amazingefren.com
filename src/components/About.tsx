import React from "react";
import {StaticImage} from 'gatsby-plugin-image'
import "../assets/About.scss";

const age = () => {
  const today = new Date().getTime()
  // Month - 1 for 0 index
  const birthDate = new Date(1999, 2, 3).getTime()
  const age_dt = today - birthDate

  return Math.floor(age_dt / (1000 * 60 * 60 * 24 * 365.25))
}

const about_me = () => {
  return (
    <div id="about-me-container">
      <div id="about-me-hey">
        Hey! I'm <span className="about-emphasis">Efren Castro</span>,
      </div>
      <p id="about-p-1">
        a {age()} year-old <span className="about-emphasis">cyber janitor</span> currently
        residing in <span className="about-emphasis">Denver</span>,
        <span className="about-emphasis" id="about-colorado">
          {" "}
          Colorado
        </span>.
      </p>
      <p id="about-p-2">
        <s>I am currently seeking new job opportunities as a{" "}
        <span className="about-emphasis">software engineer</span>.
        </s>
      </p>
    </div>
  );
};

const About = () => {
  return (
    <div id="about-root" className="section-root">
      <div id="about-container" className="section-container">
        {about_me()}
        <div id="about-logo">
          <StaticImage id="about-logo-wrapper" src="../../images/Logo.png" alt=""/>
        </div>
      </div>
    </div>
  );
};

export default About;
