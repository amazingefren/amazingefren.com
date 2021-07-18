import React from "react";
import Sections from "./skills.sections";
import Content from "./skills.content";
import { useState } from "react";
import "./skills.scss";

const Skills: React.FC = () => {
  const [active, setActive] = useState("none");
  return (
    <div id="skills-root">
      <header className="skills-header">Skills</header>
      <div id="skills-container">
        <div id="skills-sections-wrapper">
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('lang')}}>
            {Sections.Lang(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('web')}}>
            {Sections.Web(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('linux')}}>
            {Sections.Linux(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('front')}}>
            {Sections.FrontEnd(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('back')}}>
            {Sections.BackEnd(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('cross')}}>
            {Sections.Cross(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('db')}}>
            {Sections.Database(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('ui')}}>
            {Sections.Ui(active)}
          </a>
          {/* prettier-ignore */}
          <a onClick={()=>{setActive('photo')}}>
            {Sections.Photo(active)}
          </a>
        </div>
        <div id="skills-content-wrapper">
          {active == "lang" && <Content.LangContent />}
          {active == "web" && <Content.WebContent />}
          {active == "linux" && <Content.LinuxContent />}
          {active == "front" && <Content.FrontContent />}
          {active == "back" && <Content.BackContent />}
          {active == "cross" && <Content.CrossContent />}
          {active == "db" && <Content.DatabaseContent />}
          {active == "ui" && <Content.UiContent />}
          {active == "photo" && <Content.PhotoContent />}
        </div>
      </div>
    </div>
  );
};

export default Skills;
