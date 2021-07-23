import React from "react";
import anime from "animejs";
import "./intro.scss";
import { useEffect } from "react";

const animate = () => {
  const tl = anime.timeline({ loop: false });
  tl.add({
    targets: `#intro-header`,
    opacity: 1,
    delay: 100,
    duration: 500,
    easing: "easeOutQuint",
  });
  for (let i = 1; i <= 3; i++) {
    tl.add(
      {
        targets: `#intro-anim-${i}`,
        duration: 1000,
        // opacity: 1,
        easing: "easeOutQuint",
        delay: 200,
        translateY: [150, "-50%"],
      },
      "-=500"
    ).add(
      {
        targets: `#intro-anim-${i}`,
        opacity: 1,
        easing: "easeOutQuint",
        duration: 1500,
      },
      "-=1000"
    );
    if (i != 3) {
      tl.add(
        {
          targets: `#intro-anim-${i}`,
          opacity: 0,
          duration: 1000,
          easing: "easeInOutQuint",
          delay: 0,
          translateY: -150,
        },
        "-=400"
      );
    } else {
      tl.add({
        targets: `#intro-footer-arrow`,
        opacity: 1,
        duration: 1000,
        easing: "easeOutQuint",
        translateY: [-10, 0]
      })
    }
  }
};

const Intro: React.FC = () => {
  useEffect(() => {
    animate();
  }, []);
  return (
    <div id="intro-root">
      <div id="intro-header">
        <div>amazing</div>
      </div>
      <div id="intro-animation-container">
        <span id="intro-anim-1" className="iao">
          &nbsp;developer
        </span>
        <span id="intro-anim-2" className="iao">
          &nbsp;software engineer
        </span>
        <span id="intro-anim-3" className="iao">
          &nbsp;efren
        </span>
      </div>
      {/*<div id="intro-footer">
        <div className="intro-footer-link">Git</div>
        <div className="intro-footer-link">Linked</div>
        <div className="intro-footer-link">Email</div>
        <div className="intro-footer-link">Twitter</div>
      </div>*/}
    </div>
  );
};

export default Intro;
