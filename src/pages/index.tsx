import React from "react";
import {Helmet} from 'react-helmet'
import {Navbar, Education, About, Skills, Links} from '../components'
import MyLogo from '../images/Favicon.ico'
import "../assets/normalize.scss";
import "../assets/index.scss";
import { useEffect } from "react";
import Animation from '../animations/root'

export default function () {
  useEffect(()=>{
    const instance = new Animation();
    instance.animate()
  })
  return (
    <>
    <Helmet>
      <meta charSet="utf-8"/>
      <title>Efren Castro</title>
      <link rel="icon" href={MyLogo} />
    </Helmet>
    <div id="root">
      <Navbar />
      <Links />
      <div id="container">
          <About />
          <Education />
          <Skills />
      </div>
        {/*
      */}
    </div>
    </>
  );
}
