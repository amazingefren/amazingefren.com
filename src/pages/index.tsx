import React, { useState } from "react";
import Navbar from "../components/navbar";
import Intro from "../components/intro";
import Education from '../components/education'
import About from "../components/about";
import "../assets/normalize.scss";
import "../assets/index.scss";
import Skills from "../components/skills";

export default function () {
  const [count, setCount] = useState(0);

  return (
    <div id="root">
      <Navbar />
      <div id="container">
        <Intro />
        <About />
        <Education />
        <Skills />
        <div>Hello World</div>
        <button
          onClick={() => {
            setCount(count + 1);
          }}
        >
          {count}
        </button>
      </div>
    </div>
  );
}
