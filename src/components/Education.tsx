import React from "react";
import { StaticImage } from "gatsby-plugin-image";
import "../assets/Education.scss";

const Skills = () => {
  return (
    <div className="section-root" id="education-root">
      <div id="education-container" className="section-container">
        <ul id="education-list-root">
          <li className="education-list-item">
            <StaticImage
              src="../../images/Harvard-Logo.png"
              alt="Harvard_University_Logo"
              width={50}
              height={50}
              // layout="fixed"
              className="education-list-img"
            />
            <div className="education-flex-toggle">
              <header className="education-list-header">
                Harvard University
              </header>
              {/* <sup>20xx-20xx</sup>*/}
              <main>Computer Science Certification</main>
            </div>
          </li>
          <li className="education-list-item">
            <StaticImage
              src="../../images/Denver-Logo.png"
              alt="DENVER_UNIVERSITY_LOGO"
              width={50}
              height={50}
              // layout="fixed"
              className="education-list-img"
            />
            <div className="education-flex-toggle">
              <header className="education-list-header">
                University of Denver
              </header>
              {/* <sup>20xx-20xx</sup>*/}
              <main>Full Stack Web Development</main>
            </div>
          </li>
          <li className="education-list-item">
            <StaticImage
              src="../../images/Boulder-Logo.png"
              alt="CU_BOULDER_LOGO"
              width={50}
              height={50}
              // layout="fixed"
              className="education-list-img"
            />
            <div className="education-flex-toggle">
              <header className="education-list-header">
                University of Colorado Boulder
              </header>
              {/* <sup>20xx-20xx</sup>*/}
              <main>Studies in Computer Science</main>
            </div>
          </li>
          <li className="education-list-item">
            <StaticImage
              src="../../images/Aurora-Logo.png"
              alt="CC_AURORA_LOGO"
              width={50}
              height={50}
              // layout="fixed"
              className="education-list-img"
            />
            <div className="education-flex-toggle">
              <header className="education-list-header">
                Community College of Aurora
              </header>
              {/* <sup>20xx-20xx</sup>*/}
              <main>General Studies</main>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Skills;
