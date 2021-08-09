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
  console.log('Javascript: Enabled')
  console.log('Enabling Assets')
  const assets = document.getElementsByClassName('javascript-toggle-show')
  console.log(assets)
}


const Links = () => {
  const [enabled, enable] = useState(false)
  useEffect(()=>{
    enable(true)
    console.log(enabled)
  },[])
  return (
    <>
      <a
      href={!enabled ? "#skills-root": undefined}
      onClick={enabled ? ()=>{console.log('clicked')}: undefined}
      className="navbar-link"
      >hi</a>
    </>
  )
}

const Intro: React.FC = () => {
  useEffect(()=>{
    javascriptEnable()
  }, [])
  return (
    <div>
      <div className="section-root" id="header-root">
        <div id="intro-container" className="section-container">
          <div id="intro-header">amazingefren</div>
          <div id="intro-supp">
            
            {<Links/>}
               
            {/* LINKS WITH / WITHOUT JAVASCRIPT
            <noscript>
              <a href="#skills-root">hi</a>
            </noscript>
            */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
