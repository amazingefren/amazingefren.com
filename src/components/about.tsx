import React from "react";
import { useEffect } from "react";
import "./about.scss";
import anime from "animejs";

const animate = () => {
  const tl = anime.timeline({ loop: false });
  tl.add({
    targets: `#about-me-container`,
    // opacity: 1,
    duration: 1000,
    delay: 1000,
    easing: "easeOutQuint",
    translateX: [-200,0]
  }).add({
    targets: `#about-me-container`,
    opacity: 1,
    duration: 1000,
    easing: "easeOutQuint",
    // translateX: [-200,0]
  }, "-=800")
};

const about_me = () => {
  return (
    <p id="about-me-container">
      Hey! I'm <span className="about-emphasis">Efren Castro</span>, a 22
      year-old <span className="about-emphasis">coder</span> currently residing
      in <span className="about-emphasis">Denver</span>,
      <span className="about-emphasis" id="about-colorado">
        {" "}
        Colorado
      </span>
      <br />I am currently <span className="about-emphasis">seeking</span> new
      job opportunities as a{" "}
      <span className="about-emphasis">web developer</span>
    </p>
  );
};

const About = () => {
  useEffect(() => {
    animate();
  });
  return (
    <div id="about-root">
      <div>{about_me()}</div>
    </div>
  );
};

export default About;
