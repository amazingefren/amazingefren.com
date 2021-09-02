import React from "react";
import {StaticImage} from 'gatsby-plugin-image'
import "../assets/About.scss";

const about_me = () => {
  return (
    <div id="about-me-container">
      <div id="about-me-hey">
        Hey! I'm <span className="about-emphasis">Efren Castro</span>,
      </div>
      <p id="about-p-1">
        a 22 year-old <span className="about-emphasis">coder</span> currently
        residing in <span className="about-emphasis">Denver</span>,
        <span className="about-emphasis" id="about-colorado">
          {" "}
          Colorado
        </span>.
      </p>
      <p id="about-p-2">
        I am currently seeking new job opportunities as a{" "}
        <span className="about-emphasis">web developer</span>.
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
          <StaticImage id="about-logo-wrapper" src="../../images/My-Logo.png" alt=""/>
        </div>
      </div>
    </div>
  );
};

export default About;
