// import React from "react";
// import "../assets/Navbar.scss";

// const Navbar: React.FC = () => {
//   return (
//     <div id="navbar-root">
//       <div>☰</div>
//     </div>
//   );
// };
// export default Navbar;
//

// import { StaticImage } from "gatsby-plugin-image";
import React, { useEffect, useState } from "react";
import "../assets/Navbar.scss";
// import logo from "../images/My-Logo.ico"

const scroll = (name: string) => {
  document.getElementById(name)?.scrollIntoView();
};

const NavbarItems = () => {
  const [enabled, enable] = useState(false);
  useEffect(() => {
    console.log("Javascript: Enabled");
    console.log("Enabling Assets");
    enable(true);
  }, []);
  return (
    <>
      <a
        href={!enabled ? "#about-root" : undefined}
        onClick={enabled ? () => scroll("about-root") : undefined}
        className="navbar-link"
        id="navbar-link-left"
      >
        <span>About</span>
      </a>
      <a
        href={!enabled ? "#project-root" : undefined}
        onClick={enabled ? () => scroll("project-root") : undefined}
        className="navbar-link"
      >
        <span>Projects</span>
      </a>
      <a
        href={!enabled ? "#skills-root" : undefined}
        onClick={enabled ? () => scroll("skills-root") : undefined}
        className="navbar-link"
      >
        <span>Skills</span>
      </a>
      <a
        href={!enabled ? "#education-root" : undefined}
        onClick={enabled ? () => scroll("education-root") : undefined}
        className="navbar-link"
      >
        <span>Education</span>
      </a>
      <a
        href={!enabled ? "#contact-root" : undefined}
        onClick={enabled ? () => scroll("contact-root") : undefined}
        className="navbar-link"
      >
        <span>Contact Me</span>
      </a>
    </>
  );
};

const Intro: React.FC = () => {
  const [hamburger, setHamburger] = useState<boolean>(false);
  const [enable, setEnable] = useState<boolean>(false);
  useEffect(()=>{
    setEnable(true)
  },[setEnable])
  return (
    <div className="section-root" id="navbar-root">
      <div id="navbar-container" className="section-container">
        <div id="navbar-header">
          <div id="navbar-header-text">Efren Castro</div>
        </div>
        <div className="navbar-link-container">
          <NavbarItems />
          <div className="navbar-link" id="navbar-hamburger">
            <input
              name="navbar-hamburger-toggle"
              type="checkbox"
              id="navbar-hamburger-button"
              checked={enable ? hamburger : false}
              onChange={() => {
                setHamburger(!hamburger);
              }}
            />
            <label
              htmlFor="navbar-hamburger-toggle"
              id="navbar-hamburger-active"
            >
              <div id="navbar-hamburger-topbun"></div>
              <div id="navbar-hamburger-patty"></div>
              <div id="navbar-hamburger-bottombun"></div>
            </label>
            <div
              id="navbar-hamburger-link"
              onClick={() => {
                setHamburger(!hamburger);
              }}
            >
              <NavbarItems />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
