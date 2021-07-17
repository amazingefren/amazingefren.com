import React from "react";
import "./about.scss";

const about_me = () => {
  return (
    <p>
      Hey! I'm Efren Castro, Full Stack Developer and Software Engineer
      currently residing in Denver, CO.
    </p>
  );
};

const describe_me = () => {
  return <p>I am often described as an ambitious individual, I always find something new to learn, to try, to create.</p>;
};

const why_me = () => {
  return (
    <p>
      I have been a
      <i>
        <strong> lifelong </strong>
      </i>
      linux user and have to accredit most of my knowledge to it and its
      community
    </p>
  );
};

const also_me = () => {
  return (
    <p>
      My ventures have gone far and wide
      <li>Counter-Strike - Univeristy of Colorado Boulder</li>
      <li>Film Award Winner (x3) - Panasonic</li>
      <li>Robotic Engineering Mentor</li>
      <li>and more...</li>
    </p>
  );
};

const About = () => {
  return (
    <div id="about-root">
      <div>My Story</div>
      <div>
        {about_me()}
        {describe_me()}
        {why_me()}
        {also_me()}
      </div>
    </div>
  );
};

export default About;
