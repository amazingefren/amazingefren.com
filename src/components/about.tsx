import React from "react";
import "./about.scss";

const about_me = () => {
  return (
    <p>
      Hey! I'm {" "}
      <span className="about-emphasis">Efren Castro</span>, a 22 year-old {" "}
      <span className="about-emphasis">coder</span> currently residing in {" "}
      <span className="about-emphasis">Denver</span>, 
      <span className="about-emphasis" id="about-colorado"> Colorado</span>
      <br/>
      I am currently {" "}
      <span className="about-emphasis">seeking</span> new job opportunities as a {" "}
      <span className="about-emphasis">web developer</span>
    </p>
  );
};

const About = () => {
  return (
    <div id="about-root">
      <div>{about_me()}</div>
    </div>
  );
};

export default About;
