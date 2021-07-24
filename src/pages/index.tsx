import React from "react";
import Navbar from "../components/navbar";
import Intro from "../components/intro";
import Education from '../components/education'
import About from "../components/about";
import "../assets/normalize.scss";
import "../assets/index.scss";
import Skills from "../components/skills";

export default function () {
  return (
    <div id="root">
      <Navbar />
      <div id="container">
        <Intro />
        <About />
        <Skills />
        <Education />
      </div>
    </div>
  );
}
