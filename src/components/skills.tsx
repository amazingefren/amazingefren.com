import React from "react";
import Sections from './skills.sections'
import Content from './skills.content'
import { useState } from "react";
import "./skills.scss";


const Skills: React.FC = () => {
  const [active, setActive] = useState("none");
  const toggle = (sec: string) => {
    if (sec == active) {
      setActive('none')
    } else {
     setActive(sec) 
    }
  }
  return (
    <div id="skills-root">
      <div className="skills-container" id="skills-container">
        <header className="skills-header">SKILLS</header>
        <div id="skills-sections-wrapper">
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('lang')}}>
            {Sections.Lang(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('web')}}>
            {Sections.Web(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('linux')}}>
            {Sections.Linux(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('front')}}>
            {Sections.FrontEnd(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('back')}}>
            {Sections.BackEnd(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('cross')}}>
            {Sections.Cross(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('db')}}>
            {Sections.Database(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('ui')}}>
            {Sections.Ui(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{toggle('photo')}}>
            {Sections.Photo(active)}
          </a>
        </div>

        <div id="skills-content-wrapper">
        {active=="lang" && <Content.LangContent/>}
        {active=="web" && <Content.WebContent/>}
        {active=="linux" && <Content.LinuxContent/>}
        {active=="front" && <Content.FrontContent/>}
        {active=="back" && <Content.BackContent/>}
        {active=="cross" && <Content.CrossContent/>}
        {active=="db" && <Content.DatabaseContent/>}
        {active=="ui" && <Content.UiContent/>}
        {active=="photo" && <Content.PhotoContent/>}
        </div>
      </div>
    </div>
  );
};

export default Skills;
