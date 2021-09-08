import React from "react";
import "../assets/Projects.scss";
import SOSILELOGIN from "../../images/Sosile-Login.png";
import SOSILEPROFILE from "../../images/Sosile-Profile.png";

interface TechType {
  name: string;
  url: string;
  img: any;
}
interface ProjectType {
  name: string;
  url: string;
  git: string;
  tech: Array<TechType>;
  img: string;
  description: string;
}

// https://github.com/Microsoft/TypeScript/issues/26045
// key:string = loss of inferred types
// const Tech: { [key: string]: TechType } = {

const Tech = {
  nextjs: {
    name: "NextJS",
    url: "hi",
    img: require("/images/Next.react.svg"),
  },
  apollo: {
    name: "Apollo",
    url: "idk",
    img: require("/images/Apollo.react.svg"),
  },
  typescript: {
    name: "Typescript",
    url: "idk",
    img: require("/images/Typescript.react.svg"),
  },
  node: {
    name: "NodeJS",
    url: "idk",
    img: require("/images/Node.react.svg"),
  },
  nestjs: {
    name: "NestJS",
    url: "IDK",
    img: require("/images/Nest.react.svg"),
  },
};

const ProjectData: ProjectType[] = [
  {
    name: "Sosile Client",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-CLIENT",
    tech: [Tech["nextjs"], Tech["apollo"], Tech.typescript],
    img: SOSILEPROFILE,
    description: "SOSILE is the current project I am working on",
  },
  {
    name: "Sosile Server",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-SERVER",
    tech: [Tech.nestjs, Tech.apollo, Tech.typescript, Tech.node],
    // img: "../../images/Sosile-Login.png",
    img: SOSILELOGIN,
    description: "SOSILE is the current project I am working on",
  },
];

const ProjectCard = ({ data: project }: { data: typeof ProjectData[0] }) => {
  return (
    <div className="project-card">
      <div className="project-card-header">
        <div className="project-card-top">
          <h2>{project.name}</h2>
        </div>
        <div className="project-card-img-wrapper">
          <img src={project.img} className="project-card-img" />
        </div>
        {/*
          <div className="project-card-img-overlay" />
        */}
        <div className="project-card-description">{project.description}</div>
        <div className="project-card-tech-wrapper">
          {project.tech.map(({ name, img: SVG }) => {
            return (
              <div
                className={"project-card-tech-img-wrapper " + "tech-" + name}
                key={name}
              >
                <SVG className="project-card-tech-img" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  return (
    <div className="section-root" id="project-root">
      <div className="section-container" id="project-container">
        {ProjectData.map((project: typeof ProjectData[0]) => {
          // console.log(project);
          return <ProjectCard key={project.name} data={project} />;
        })}
      </div>
    </div>
  );
};

export default Projects;
