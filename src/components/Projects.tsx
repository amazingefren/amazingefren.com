import React from "react";

interface TechType {
  name: string;
  url: string;
}
interface ProjectType {
  name: string;
  url: string;
  git: string;
  tech: Array<TechType>;
  description: string;
}


// https://github.com/Microsoft/TypeScript/issues/26045
// key:string = loss of inferred types
const Tech: { [key: string]: TechType } = {
  nextjs: {
    name: "NextJS",
    url: "hi",
  },
  apollo: {
    name: "Apollo",
    url: "idk",
  },
  jwtAuthentication: {
    name: "User Authentication",
    url: "idk",
  },
  typescript: {
    name: "Typescript",
    url: "idk",
  },
  node: {
    name: "NodeJS",
    url: "idk",
  },
  nestjs: {
    name: "NestJS",
    url: "IDK",
  },
};

const ProjectData: ProjectType[] = [
  {
    name: "SOSILE CLIENT",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-CLIENT",
    tech: [
      Tech['nextjs'],
      Tech['apollo'],
      Tech.jwtAuthentication,
      Tech.typescript,
      Tech.node,
    ],
    description: "SOSILE is the current project I am working on",
  },
  {
    name: "SOSILE SERVER",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-SERVER",
    tech: [
      Tech.nestjs,
      Tech.apollo,
      Tech.jwtAuthentication,
      Tech.typescript,
      Tech.node,
    ],
    description: "SOSILE is the current project I am working on",
  },
];

const ProjectCard = ({ data: project }: { data: typeof ProjectData[0] }) => {
  return (
    <div>
      <div>{project.name}</div>
      <div>
        {project.tech.map(({ name }) => (
          <div>{name}</div>
        ))}
        <span>CI Test</span>
      </div>
    </div>
  );
};

const Projects = () => {
  return (
    <div className="section-root" id="project-root">
      <div className="section-container" id="project-container">
        {ProjectData.map((project: typeof ProjectData[0]) => {
          console.log(project)
          return <ProjectCard key={project.name} data={project} />
        })}
      </div>
    </div>
  );
};

export default Projects;
