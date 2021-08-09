import React from "react";
import {Helmet} from 'react-helmet'
import {Navbar, Education, About, Skills} from '../components'
import MyLogo from '../images/Favicon.ico'
import "../assets/normalize.scss";
import "../assets/index.scss";
// import Skills from "../components/skills";

export default function () {
  return (
    <>
    <Helmet>
      <meta charSet="utf-8"/>
      <title>Efren Castro</title>
      <link rel="icon" href={MyLogo} />
    </Helmet>
    <div id="root">
      <Navbar />
      <div id="container">
        <About />
        <Education />
        <Skills />
      </div>
    </div>
    </>
  );
}
