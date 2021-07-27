import React from "react";
import anime from "animejs";
import { useEffect } from "react";
import "../assets/Header.scss";
import { StaticImage } from "gatsby-plugin-image";

const animate = () => {
  let tl = anime.timeline({ loop: false });
  tl.add({
    targets: `#intro-header`,
    opacity: 1,
    delay: 100,
    duration: 500,
    easing: "easeOutQuint",
  });
  tl = anime.timeline({ loop: true });
  for (let i = 1; i <= 3; i++) {
    tl.add(
      {
        targets: `#intro-anim-${i}`,
        duration: 1000,
        // opacity: 1,
        easing: "easeOutQuint",
        delay: 200,
        translateY: [100, "-50%"],
      }
      // "-=500"
    )
      .add(
        {
          targets: `#intro-anim-${i}`,
          opacity: 1,
          easing: "easeOutQuint",
          duration: 1500,
        },
        "-=1000"
      )
      // if (i != 3) {
      .add(
        {
          targets: `#intro-anim-${i}`,
          opacity: 0,
          duration: 1000,
          easing: "easeInOutQuint",
          delay: 1000,
          translateY: -150,
        },
        "-=400"
      );
    // } else {
    // tl.add({
    // targets: `#intro-anim-container`,
    // left: 0,
    // duration: 1000,
    // easing: "easeOutQuint",
    // });
    // }
  }
};

const Intro: React.FC = () => {
  useEffect(() => {
    animate();
  }, []);
  return (
    <div className="section-root">
      <div id="intro-container" className="section-container">
        <div id="intro-header">AmazingEfren ≝&nbsp;</div>
        <div id="intro-animation-container">
          <span id="intro-anim-1" className="iao">
            Developer
          </span>
          <span id="intro-anim-2" className="iao">
            Software Engineer
          </span>
          <span id="intro-anim-3" className="iao">
            Tech Enthusiast
          </span>
        </div>
        <div id="intro-footer">
          <a
            className="intro-footer-link"
            href="https://github.com/amazingefren"
          >
            <StaticImage
              src="../images/Github-Logo.png"
              alt="github.com"
              width={32}
              height={32}
            />
            /amazingefren
          </a>
          <a
            className="intro-footer-link"
            href="https://linkedin.com/in/amazingefren"
          >
            <StaticImage
              src="../images/Linkedin-Logo.png"
              alt="linkedin.com"
              width={32}
              height={32}
            />

            /in/amazingefren
          </a>
          <a
            className="intro-footer-link"
            href="https://linkedin.com/in/amazingefren"
          >
            <StaticImage
              src="../images/Email-Logo.png"
              alt="linkedin.com"
              width={32}
              height={32}
            />
            yuh
          </a>

          <a
            className="intro-footer-link"
            href="https://linkedin.com/in/amazingefren"
          >
            <StaticImage
              src="../images/Twitter-Logo.png"
              alt="linkedin.com"
              width={32}
              height={32}
            />
            yuh
          </a>
        </div>
      </div>
    </div>
  );
};

export default Intro;
