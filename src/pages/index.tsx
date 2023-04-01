import React from "react";
import { Helmet } from "react-helmet";
import {
  Navbar,
  Education,
  About,
  Skills,
  Links,
  Projects,
  Contact,
} from "../components";
import MyLogo from "/images/Favicon.ico";
import MyImage from "../../images/SEO.png";
import "../assets/normalize.scss";
import "../assets/index.scss";
import End from "../components/End";
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
        <meta property="og:title" content="Efren Castro Portfolio" />
        <meta
          property="og:description"
          content="Check Me Out! oh and hire me :)"
        />
        <meta property="og:url" content="https://amazingefren.com" />
        <meta
          property="og:image"
          content={"https://amazingefren.com" + MyImage}
        />
        <link rel="icon" href={MyLogo} />
      </Helmet>
      <div id="root">
        <Navbar />
        <div id="container">
          <About />
          {/* <Projects /> */}
          <Skills />
          <Education />
          <Contact />
          <End />
        </div>
        <Links />
        {/*
         */}
      </div>
    </>
  );
}
