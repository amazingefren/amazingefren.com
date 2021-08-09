import React from "react";
import {Navbar, Education, About, Skills} from '../components'
import "../assets/normalize.scss";
import "../assets/index.scss";
// import Skills from "../components/skills";

export default function () {
  return (
    <div id="root">
      <Navbar />
      <div id="container">
        <About />
        <Education />
        <Skills />
      </div>
    </div>
  );
}
