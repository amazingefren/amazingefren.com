import React from "react";
import "../assets/Skills.scss";

const Skills: React.FC = () => {
  return (
    <div className="section-root" id="skills-root">
      <div id="skills-container" className="section-container">
        {/* SECTION: WEBDEV */}
        <div className="skills-section">
          <h2>Web Development</h2>
          <ul className="skills-section-list">
            <li className="skills-section-list-parent">
              <h3>Technologies</h3>
              <ul>
                <li className="skills-list-like">Typescript</li>
                <li className="skills-list-good">Javascript</li>
                <li className="skills-list-good">HTML5</li>
                <li className="skills-list-good">CSS / SASS</li>
                <li className="skills-list-learning">WebGL (wip)</li>
                <li className="skills-list-learning">Web Assembly</li>
              </ul>
            </li>
            <li className="skills-section-list-parent">
              <h3>Frameworks</h3>
              <ul>
                <li className="skills-list-like">React</li>
                <li className="skills-list-like">Gatsby.js</li>
                <li className="skills-list-good">Next.js</li>
                <li className="skills-list-good">jQuery</li>
                <li className="skills-list-learning">Vue.js</li>
              </ul>
            </li>
          </ul>
        </div>
        {/* SECTION: Interfaces */}
        <div className="skills-section">
          <h2>Programming Interfaces</h2>
          <ul className="skills-section-list">
            {/* SUB: NodeJS */}
            <li className="skills-section-list-parent">
              <h3>Node.js</h3>
              <ul>
                <li className="skills-list-good">Node.js</li>
                <li className="skills-list-good">Express</li>
                <li className="skills-list-good">Fastify</li>
                <li className="skills-list-good">Koa</li>
                <li className="skills-list-good">NestJS</li>
                <li className="skills-list-good">Authentication</li>
              </ul>
            </li>
            {/* SUB: Design */}
            <li className="skills-section-list-parent">
              <h3>Design Patterns</h3>
              <ul>
                <li className="skills-list-good">REST</li>
                <li className="skills-list-good">CRUD</li>
                <li className="skills-list-good">GraphQL</li>
                <li className="skills-list-good">User Authentication</li>
                <li className="skills-list-good">Session Management</li>
              </ul>
            </li>
            {/* SUB: Database */}
            <li className="skills-section-list-parent">
              <h3>Database</h3>
              <ul>
                <li className="skills-list-good">MySQL</li>
                <li className="skills-list-good">PostgreSQL</li>
                <li className="skills-list-good">MongoDB</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Extra</h3>
              <ul>
                <li className="skills-list-good">Golang - http</li>
                <li className="skills-list-good">Rust - Actix Web</li>
                <li className="skills-list-good">Python - Flask</li>
              </ul>
            </li>
          </ul>
        </div>
        {/* SECTION: Devops */}
        <div className="skills-section">
          <h2>Devops</h2>
          <ul className="skills-section-list">
            {/* SUB: Infrastructure */}
            <li className="skills-section-list-parent">
              <h3>Infrastructure</h3>
              <ul>
                <li className="skills-list-good">NGINX</li>
                <li className="skills-list-good">Amazon AWS (wip)</li>
                <li className="skills-list-good">Microsoft Azure (wip)</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent">
              <h3>Deployment</h3>
              <ul>
                <li className="skills-list-good">Jenkins (wip)</li>
                <li className="skills-list-good">Docker</li>
                <li className="skills-list-good">Vagrant (wip)</li>
                <li className="skills-list-good">CI/CD (wip)</li>
                <li className="skills-list-good">IaC Skills (wip)</li>
                <li className="skills-list-good">Kubernetes (wip)</li>
                <li className="skills-list-good">Virtual Machines / VMWare (wip)</li>
                <li className="skills-list-good">Domain Management</li>
                <li className="skills-list-good">SSL Certification</li>
                <li className="skills-list-good">Proxies</li>
                <li className="skills-list-good">Git</li>
              </ul>
            </li>
            {/* SUB: Extra */}
          </ul>
        </div>
        {/* SECTION: */}
        <div className="skills-section">
          <h2>Extra</h2>
          <ul className="skills-section-list">
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Languages (all types)</h3>
              <ul>
                <li className="skills-list-good">C</li>
                <li className="skills-list-good">C++</li>
                <li className="skills-list-good">Rust</li>
                <li className="skills-list-good">Golang</li>
                <li className="skills-list-good">Python</li>
                <li className="skills-list-good">Shell Scripts - bash/zsh/sh (not fish tho)</li>
                <li className="skills-list-good">Markdown</li>
                <li className="skills-list-good">Java (wip)</li>
                <li className="skills-list-good">Mobile Development (wip)</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Linux</h3>
              <ul>
                <li className="skills-list-good">Inter-Process Communications</li>
                <li className="skills-list-good">-- Init Systems --</li>
                <li className="skills-list-good">Systemd</li>
                <li className="skills-list-good">OpenRC</li>
                <li className="skills-list-good">Runit</li>
                <li className="skills-list-good">-- Utilities --</li>
                <li className="skills-list-good">Vim (currently using neovim tho)</li>
                <li className="skills-list-good">wget/curl/awk/grep/ps + alot more (SECTION) WIP</li>
                <li className="skills-list-good">-- Distributions --</li>
                <li className="skills-list-good">Debian</li>
                <li className="skills-list-good">Fedora</li>
                <li className="skills-list-good">Gentoo</li>
                <li className="skills-list-good">Arch</li>
                <li className="skills-list-good">-- Learning --</li>
                <li className="skills-list-good">Security (also for deployment section)</li>
                <li className="skills-list-good">Serverless (also for deployment section)</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
          </ul>
        </div>
        {/* SECTION: */}
      </div>
    </div>
  );
};

export default Skills;
