import React from "react";
import anime from "animejs";
import "./intro.scss";
import { useEffect } from "react";

const anim_elements = (count) => {
  const tl = anime.timeline({loop:false})
  for (let i = 1; i <= count; i++){
    tl.add({
      targets: `#intro-anim-${i}`,
      duration: 1000,
      // opacity: 1,
      easing: "easeOutQuint",
      delay: 200,
      translateY: [150, '-50%']
    })
    .add({
      targets: `#intro-anim-${i}`,
      opacity: 1,
      easing: "easeOutQuint",
      duration: 1500,
    }, '-=800')
    .add({
      targets: `#intro-anim-${i}`,
      opacity: 0,
      duration: 1000,
      easing: "easeInQuint",
      delay: 0,
      translateY: -150
    }, '-=200')
  }
 
}


const animate = () => {
  console.log("something");
  anim_elements(3)

  // anime
  //   .timeline({ loop: false })
  //   .add({
  //     targets: "#intro-anim-1",
  //     duration: 1000,
  //     // opacity: 1,
  //     easing: "easeOutQuint",
  //     delay: 200,
  //     translateY: [150, '-50%']
  //   })
  //   .add({
  //     targets: "#intro-anim-1",
  //     opacity: 1,
  //     easing: "easeOutQuint",
  //     duration: 1500,
  //   }, '-=800')
  //   .add({
  //     targets: "#intro-anim-1",
  //     opacity: 0,
  //     duration: 1000,
  //     easing: "easeInQuint",
  //     delay: 0,
  //     translateY: -150
  //   }, '-=200')
  //   .add({
  //     targets: "#intro-anim-2",
  //     duration: 1000,
  //     // opacity: 1,
  //     easing: "easeOutQuint",
  //     delay: 200,
  //     translateY: [150, '-50%']
  //   })
  //   .add({
  //     targets: "#intro-anim-2",
  //     opacity: 1,
  //     easing: "easeOutQuint",
  //     duration: 1500,
  //   }, '-=800')
};

const Intro: React.FC = () => {
  useEffect(() => {
    animate();
  });
  return (
    <div id="intro-root">
      <div id="intro-header">amazing</div>
      <div id="intro-animation-container">
        <span id="intro-anim-1" className="iao">
          developer
        </span>
        <span id="intro-anim-2" className="iao">
          software
        </span>
        <span id="intro-anim-3" className="iao">
          efren
        </span>
      </div>
    </div>
  );
};

export default Intro;
