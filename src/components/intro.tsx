import React from "react";
import anime from "animejs";
import "./intro.scss";
import { useEffect } from "react";

const animate = () => {
  console.log("something");
  const text = ["developer", "software", "efren"];
  const parent = document.getElementById("#intro-animation-container");
  if (parent) {
    text.forEach((child, i) => {
      const node = document.createElement("span");
      node.classList.add("iao");
      node.setAttribute("id", (i + 1).toString());
      const content = document.createTextNode(child);
      node.appendChild(content);
      parent?.appendChild(node);
    });
  }
  const tl = anime.timeline({ loop: false });
  for (let i = 1; i <= 3; i++) {
    tl.add({
      targets: `#intro-anim-${i}`,
      duration: 1000,
      // opacity: 1,
      easing: "easeOutQuint",
      delay: 200,
      translateY: [150, "-50%"],
    })
      .add(
        {
          targets: `#intro-anim-${i}`,
          opacity: 1,
          easing: "easeOutQuint",
          duration: 1500,
        },
        "-=800"
      )
      .add(
        {
          targets: `#intro-anim-${i}`,
          opacity: 0,
          duration: 1000,
          easing: "easeInOutQuint",
          delay: 0,
          // translateY: -150
        },
        "-=200"
      );
  }
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
