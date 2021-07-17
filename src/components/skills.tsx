import React from "react";
import Sections from './skills.sections'
import { useState } from "react";
import "./skills.scss";


const Skills: React.FC = () => {
  const [active, setActive] = useState("lang");
  const toggle = (sec: string) => {
    if (sec == active) {
      setActive('none')
    } else {
     setActive(sec) 
    }
  }
  return (
    <div id="skills-root">
      <div className="skills-container" id="skills-skills-container">
        <header className="skills-header">SKILLS</header>
        <div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('lang')}}>
            {Sections.Lang(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('web')}}>
            {Sections.Web(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('linux')}}>
            {Sections.Linux(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('front')}}>
            {Sections.FrontEnd(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('back')}}>
            {Sections.BackEnd(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('cross')}}>
            {Sections.Cross(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('db')}}>
            {Sections.Database(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('ui')}}>
            {Sections.Ui(active)}
          </div>
          {/* prettier-ignore */}
          <div onClick={()=>{toggle('photo')}}>
            {Sections.Photo(active)}
          </div>
        </div>
      </div>
      <div>_spacer</div>
    </div>
  );
};

export default Skills;
