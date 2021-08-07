import React from "react";
import "../assets/About.scss";

const about_me = () => {
  return (
    <div id="about-me-container">
      <div id="about-me-hey">
        Hey! I'm <span className="about-emphasis">Efren Castro</span>
      </div>
      <p>
        A 22 year-old <span className="about-emphasis">developer</span> currently
        residing in <span className="about-emphasis">Denver</span>,
        <span className="about-emphasis" id="about-colorado">
          {" "}
          Colorado
        </span>
        <br />I am currently seeking new job opportunities as a{" "}
        <span className="about-emphasis">web developer</span>
      </p>
    </div>
  );
};

const About = () => {
  return (
    <div id="about-root" className="section-root">
      <div id="about-container" className="section-container">
        {about_me()}
      </div>
    </div>
  );
};

export default About;
