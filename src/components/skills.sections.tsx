import React from "react";

export default {
  Lang: (active: string) => {
    if (active == "lang") {
      return <div>Languages Active</div>;
    } else {
      return <div>Languages</div>;
    }
  },

  Web: (active: string) => {
    if (active == "web") {
      return <div>Web Development Active</div>;
    } else {
      return <div>Web Development</div>;
    }
  },

  Linux: (active: string) => {
    if (active == "linux") {
      return <div>Linux Active</div>;
    } else {
      return <div>Linux</div>;
    }
  },

  FrontEnd: (active: string) => {
    if (active == "front") {
      return <div>Frontend Frameworks Active</div>;
    } else {
      return <div>Frontend Frameworks</div>;
    }
  },

  BackEnd: (active: string) => {
    if (active == "back") {
      return <div>Backend Frameworks Active</div>;
    } else {
      return <div>Backend Frameworks</div>;
    }
  },

  Cross: (active: string) => {
    if (active == "cross") {
      return <div>Cross Platform Active</div>;
    } else {
      return <div>Cross Platform</div>;
    }
  },

  Database: (active: string) => {
    if (active == "db") {
      return <div>Database Active</div>;
    } else {
      return <div>Database</div>;
    }
  },

  Ui: (active: string) => {
    if (active == "ui") {
      return <div>UI/UX Active</div>;
    } else {
      return <div>UI/UX</div>;
    }
  },

  Photo: (active: string) => {
    if (active == "photo") {
      return <div>Photo/Video Active</div>;
    } else {
      return <div>Photo/Video</div>;
    }
  },
};
