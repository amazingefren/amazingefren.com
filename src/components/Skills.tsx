import React from "react";
import "../assets/Skills.scss";

const Skills: React.FC = () => {
  return (
    <div className="section-root">
      <div id="skills-container" className="section-container">
        <h1>BIG OL LIST</h1>
        {/* SECTION: WEBDEV */}
        <div>
          <span>Web Development</span>
          <ul>
            <li>Javascript / Typescript</li>
            <li>WASM</li>
            <li>GraphQL</li>
            <li>HTML5</li>
            <li>CSS/SASS</li>
            <li>React</li>
            <li>Vue.js</li>
          </ul>
        </div>
        {/* SECTION: Interfaces */}
        <div>
          <span>Programming Interfaces</span>
          <ul>
            {/* SUB: NodeJS */}
            <li>
              <span>Node.js</span>
              <ul>
                <li>Node.js</li>
                <li>Express</li>
                <li>Fastify</li>
                <li>Koa</li>
                <li>NestJS</li>
                <li>GraphQL</li>
                <li>Authentication</li>
              </ul>
            </li>
            {/* SUB: Design */}
            <li>
              <span>Design Patterns</span>
              <ul>
                <li>REST</li>
                <li>CRUD</li>
                <li>GraphQL</li>
                <li>User Authentication</li>
                <li>Session Management</li>
              </ul>
            </li>
            {/* SUB: Database */}
            <li>
              <span>Database</span>
              <ul>
                <li>MySQL</li>
                <li>PostgreSQL</li>
                <li>MongoDB</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li>
              <span>Extra</span>
              <ul>
                <li>Golang - http</li>
                <li>Rust - Actix Web</li>
                <li>Python - Flask</li>
              </ul>
            </li>
          </ul>
        </div>
        {/* SECTION: Devops */}
        <div>
          <span>Devops</span>
          <ul>
            {/* SUB: Infrastructure */}
            <li>
              <span>Infrastructure</span>
              <ul>
                <li>NGINX</li>
                <li>Amazon AWS (wip)</li>
                <li>Microsoft Azure (wip)</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li>
              <span>Automation / Virtualization / Deployment</span>
              <ul>
                <li>Jenkins (wip)</li>
                <li>Docker</li>
                <li>Vagrant (wip)</li>
                <li>CI/CD (wip)</li>
                <li>IaC Skills (wip)</li>
                <li>Kubernetes (wip)</li>
                <li>Virtual Machines / VMWare (wip)</li>
                <li>Domain Management</li>
                <li>SSL Certification</li>
                <li>Proxies</li>
                <li>Git</li>
              </ul>
            </li>
            {/* SUB: Extra */}
          </ul>
        </div>
        {/* SECTION: */}
        <div>
          <span>Extra</span>
          <ul>
            {/* SUB: Extra */}
            <li>
              <span>Languages (all types)</span>
              <ul>
                <li>C</li>
                <li>C++</li>
                <li>Rust</li>
                <li>Golang</li>
                <li>Python</li>
                <li>Shell Scripts - bash/zsh/sh (not fish tho)</li>
                <li>Markdown</li>
                <li>Java (wip)</li>
                <li>Mobile Development (wip)</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li>
              <span>Linux</span>
              <ul>
                <li>Inter-Process Communications</li>
                <li>-- Init Systems --</li>
                <li>Systemd</li>
                <li>OpenRC</li>
                <li>Runit</li>
                <li>-- Utilities --</li>
                <li>Vim (currently using neovim tho)</li>
                <li>wget/curl/awk/grep/ps + alot more (SECTION) WIP</li>
                <li>-- Distributions --</li>
                <li>Debian</li>
                <li>Fedora</li>
                <li>Gentoo</li>
                <li>Arch</li>
                <li>-- Learning --</li>
                <li>Security (also for deployment section)</li>
                <li>Serverless (also for deployment section)</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Skills;
