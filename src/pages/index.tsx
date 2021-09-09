import React from "react";
import { Helmet } from "react-helmet";
import {
  Navbar,
  Education,
  About,
  Skills,
  Links,
  Projects,
} from "../components";
import MyLogo from "/images/Favicon.ico";
import "../assets/normalize.scss";
import "../assets/index.scss";
// import { useEffect } from "react";
// import Animation from '../animations/root'

export default function () {
  // useEffect(()=>{
  //   const animation = new Animation();
  //   animation.start()
  // })
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>Efren Castro</title>
        <meta property="og:image" content="../../images/My-Logo.png"/>
        <link rel="icon" href={MyLogo} />
      </Helmet>
      <div id="root">
        <Navbar />
        <Links />
        <div id="container">
          <About />
          <Projects />
          <Skills />
          <Education />
        </div>
        {/*
         */}
      </div>
    </>
  );
}
