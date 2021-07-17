import React from "react";
import "./skills.scss";

const Skills: React.FC = () => {
  return (
    <div id="skills-root">
      <div className="skills-container" id="skills-education-container">
        <header className="skills-header">EDUCATION</header>
        <ul>
          <li className="skills-education-list">
            <div>ICON?</div>
            <header className="skills-education-header">
              Harvard University
            </header>
            <sub>20xx-20xx</sub>
            <main>Computer Science Certification</main>
          </li>
          <li className="skills-education-list">
            <div>ICON</div>
            <header className="skills-education-header">
              University of Denver
            </header>
            <sub>20xx-20xx</sub>
            <main>Full Stack Web Development</main>
          </li>
          <li className="skills-education-list">
            <div>ICON</div>
            <header className="skills-education-header">
              University of Colorado Boulder
            </header>
            <sub>20xx-20xx</sub>
            <main>Computer Science (incomplete)</main>
          </li>
          <li className="skills-education-list">
            <div>ICON</div>
            <header className="skills-education-header">
              Community College of Aurora
            </header>
            <sub>20xx-20xx</sub>
            <main>STEM Studies</main>
          </li>
        </ul>
      </div>
      <div className="skills-container" id="skills-skills-container">
        <header className="skills-header">SKILLS</header>
        <div>
          <div>SKILLS</div>
          <div>SKILLS</div>
          <div>SKILLS</div>
          <div>SKILLS</div>
        </div>
      </div>
      <div>_spacer</div>
    </div>
  );
};

export default Skills;
