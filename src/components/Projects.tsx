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
  description: string[];
  features: string[];
}

// https://github.com/Microsoft/TypeScript/issues/26045
// key:string = loss of inferred types
// const Tech: { [key: string]: TechType } = {

const Tech = {
  nextjs: {
    name: "NextJS",
    url: "https://nextjs.org/",
    img: require("/images/Next.react.svg"),
  },
  apollo: {
    name: "Apollo",
    url: "https://www.apollographql.com/",
    img: require("/images/Apollo.react.svg"),
  },
  typescript: {
    name: "Typescript",
    url: "https://www.typescriptlang.org/",
    img: require("/images/Typescript.react.svg"),
  },
  node: {
    name: "NodeJS",
    url: "https://nodejs.org/en/",
    img: require("/images/Node.react.svg"),
  },
  nestjs: {
    name: "NestJS",
    url: "https://nestjs.com/",
    img: require("/images/Nest.react.svg"),
  },
  prisma: {
    name: "Prisma",
    url: "https://www.prisma.io/",
    img: require("/images/Prisma.react.svg"),
  },
  fastify: {
    name: "Fastify",
    url: "https://www.fastify.io/",
    img: require("/images/Fastify.react.svg"),
  },
  postgresql: {
    name: "PostgreSQL",
    url: "https://www.postgresql.org/",
    img: require("/images/Postgres.react.svg"),

  }
};

const ProjectData: ProjectType[] = [
  {
    name: "Sosile Client",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-CLIENT",
    tech: [Tech["nextjs"], Tech["apollo"], Tech["typescript"]],
    img: SOSILEPROFILE,
    description: [
      "Client for Sosile, my currently solo developed social media demo site",
      "I started this project as a way to improve my skills as a frontend developer",
    ],
    features: ["Session Management", "GraphQL", "HTTP2"],
  },
  {
    name: "Sosile Server",
    url: "https://sosile.amazingefren.com/",
    git: "https://github.com/amazingefren/SOSILE-SERVER",
    tech: [
      Tech["nestjs"],
      Tech["prisma"],
      Tech["typescript"],
      Tech["fastify"],
      Tech["postgresql"],
    ],
    // img: "../../images/Sosile-Login.png",
    img: SOSILELOGIN,
    description: [
      "Server for Sosile, my currently solo developed social media demo site",
      "A semi-lightweight and performant* GraphQL API",
    ],
    features: ["User Authentication", "Bcrypt", "GraphQL", "OAuth 2"],
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
          <div className="project-card-left-flex">
            <div className="project-card-description">
              {project.description.map((desc) => (
                <p key={desc}>{desc}</p>
              ))}
            </div>
            <ul className="project-card-features">
              <h2>Features</h2>
              {project.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="project-card-links">
              <a href={project.git} rel="noopener noreferrer">
                Source Code
              </a>
              <a href={project.url} rel="noopener noreferrer">
                Visit Live
              </a>
            </div>
          </div>
          <img
            src={project.img}
            className="project-card-img"
            alt={project.name}
          />
        </div>
        <div className="project-card-tech-wrapper">
          {project.tech.map(({ name, img: SVG, url }) => {
            return (
              <a
                className={"project-card-tech-img-wrapper " + "tech-" + name}
                key={name}
                href={url}
                rel="noopener noreferrer"
              >
                <SVG className="project-card-tech-img" />
              </a>
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
