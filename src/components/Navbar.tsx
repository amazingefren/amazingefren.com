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

import React, { useEffect, useState } from "react";
import "../assets/Navbar.scss";

function javascriptEnable() {
  console.log("Javascript: Enabled");
  console.log("Enabling Assets");
  const assets = document.getElementsByClassName("javascript-toggle-show");
  console.log(assets);
}

const scroll = (name: string)  => {
  console.log(name)
  document.getElementById(name)?.scrollIntoView()
}

const Links = () => {
  const [enabled, enable] = useState(false);
  useEffect(() => {
    enable(true);
    console.log(enabled);
  }, []);
  return (
    <>
      <a
        href={!enabled ? "#about-root" : undefined}
        onClick={
          enabled ? ()=>scroll("about-root") : undefined
        }
        className="navbar-link"
      >
       About
      </a>
      <a
        href={!enabled ? "#education-root" : undefined}
        onClick={
          enabled ? ()=>scroll("education-root") : undefined
        }
        className="navbar-link"
      >
       Education 
      </a>
      <a
        href={!enabled ? "#skills-root" : undefined}
        onClick={
          enabled ? ()=>scroll("skills-root") : undefined
        }
        className="navbar-link"
      >
       Skills 
      </a>
      <a
        href={!enabled ? "#projects-root" : undefined}
        onClick={
          enabled ? ()=>scroll("projects-root") : undefined
        }
        className="navbar-link"
      >
       Projects
      </a>
      <a
        href={!enabled ? "#contact-root" : undefined}
        onClick={
          enabled ? ()=>scroll("contact-root") : undefined
        }
        className="navbar-link"
      >
       Contact Me
      </a>
    </>
  );
};

const Intro: React.FC = () => {
  useEffect(() => {
    javascriptEnable();
  }, []);
  return (
    <div className="section-root" id="navbar-root">
      <div id="navbar-container" className="section-container">
        <div id="navbar-header">amazingefren</div>
        <div id="navbar-links">
          <Links />
        </div>
      </div>
    </div>
  );
};

export default Intro;
