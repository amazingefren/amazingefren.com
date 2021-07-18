import React from "react";

export default {
  Lang: (active: string) => {
    if (active == "lang") {
      return <div className="skills-btn-active">Languages</div>;
    } else {
      return <div className="skills-section-btn">Languages</div>;
    }
  },

  Web: (active: string) => {
    if (active == "web") {
      return <div className="skills-btn-active">Web Development</div>;
    } else {
      return <div className="skills-section-btn">Web Development</div>;
    }
  },

  Linux: (active: string) => {
    if (active == "linux") {
      return <div className="skills-btn-active">Linux</div>;
    } else {
      return <div className="skills-section-btn">Linux</div>;
    }
  },

  FrontEnd: (active: string) => {
    if (active == "front") {
      return (
        <div className="skills-btn-active">Frontend Frameworks</div>
      );
    } else {
      return <div className="skills-section-btn">Frontend Frameworks</div>;
    }
  },

  BackEnd: (active: string) => {
    if (active == "back") {
      return (
        <div className="skills-btn-active">Backend Frameworks</div>
      );
    } else {
      return <div className="skills-section-btn">Backend Frameworks</div>;
    }
  },

  Cross: (active: string) => {
    if (active == "cross") {
      return <div className="skills-btn-active">Cross Platform</div>;
    } else {
      return <div className="skills-section-btn">Cross Platform</div>;
    }
  },

  Database: (active: string) => {
    if (active == "db") {
      return <div className="skills-btn-active">Database</div>;
    } else {
      return <div className="skills-section-btn">Database</div>;
    }
  },

  Ui: (active: string) => {
    if (active == "ui") {
      return <div className="skills-btn-active">UI/UX</div>;
    } else {
      return <div className="skills-section-btn">UI/UX</div>;
    }
  },

  Photo: (active: string) => {
    if (active == "photo") {
      return <div className="skills-btn-active">Photo/Video</div>;
    } else {
      return <div className="skills-section-btn">Photo/Video</div>;
    }
  },
};
