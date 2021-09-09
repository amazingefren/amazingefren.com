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
        <meta property="og:image" content="https://amazingefren.com/static/4712f77581c59b252522365d5220430c/b5c5b/My-Logo.webp"/>
        <meta property='og:title' content='Efren Castro Portfolio'/>
        <meta property='og:description' content='Check Me Out! oh and hire me :)'/>
        <meta property='og:url' content='https//amazingefren.com'/>
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
