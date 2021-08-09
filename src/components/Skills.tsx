import React from "react";
import "../assets/Skills.scss";

const Skills: React.FC = () => {
  return (
    <div className="section-root" id="skills-root">
      <div id="skills-container" className="section-container">
        {/* SECTION: WEBDEV */}
        <div className="skills-section">
          <div id="skills-header-parent">
            <h2>Web Development</h2>
          </div>
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
                <li className="skills-list-like">GatsbyJS</li>
                <li className="skills-list-good">Next.js</li>
                <li className="skills-list-good">jQuery</li>
                <li className="skills-list-learning">Vue.js</li>
                <li className="skills-list-learning">AngularJS</li>
              </ul>
            </li>
          </ul>
        </div>
        {/* SECTION: Interfaces */}
        <div className="skills-section">
          <div id="skills-header-parent">
            <h2>Programming Interfaces</h2>
          </div>
          <ul className="skills-section-list">
            {/* SUB: NodeJS */}
            <li className="skills-section-list-parent">
              <h3>Node.js</h3>
              <ul>
                <li className="skills-list-like">Express</li>
                <li className="skills-list-like">Fastify</li>
                <li className="skills-list-like">Koa</li>
                <li className="skills-list-like">NestJS</li>
              </ul>
            </li>
            {/* SUB: Design */}
            <li className="skills-section-list-parent">
              <h3>Design Patterns</h3>
              <ul>
                <li className="skills-list-good">REST / CRUD</li>
                <li className="skills-list-good">GraphQL</li>
                <li className="skills-list-good">User Authentication</li>
                <li className="skills-list-good">Session Management</li>
              </ul>
            </li>
            {/* SUB: Database */}
            <li className="skills-section-list-parent">
              <h3>Database</h3>
              <ul>
                <li className="skills-list-like">PostgreSQL</li>
                <li className="skills-list-good">MySQL</li>
                <li className="skills-list-good">MongoDB</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Extra</h3>
              <ul>
                <li className="skills-list-like">Rust - Actix Web</li>
                <li className="skills-list-like">Golang - http</li>
                <li className="skills-list-good">Python - Flask</li>
              </ul>
            </li>
          </ul>
        </div>
        {/* SECTION: Devops */}
        <div className="skills-section">
          <div id="skills-header-parent">
            <h2>DevOps</h2>
          </div>
          <ul className="skills-section-list">
            {/* SUB: Infrastructure */}
            <li className="skills-section-list-parent">
              <h3>Infrastructure</h3>
              <ul>
                <li className="skills-list-like">NGINX</li>
                <li className="skills-list-good">Apache</li>
                <li className="skills-list-learning">Amazon AWS (wip)</li>
                <li className="skills-list-learning">Microsoft Azure (wip)</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent">
              <h3>Deployment</h3>
              <ul>
                <li className="skills-list-good">CI/CD</li>
                <li className="skills-list-good">TCP/IP Fundamentals</li>
                <li className="skills-list-good">Network Protocols</li>
                <li className="skills-list-good">Redis</li>
                <li className="skills-list-learning">Security</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent">
              <h3>IaC Skills</h3>
              <ul>
                <li className="skills-list-good">Docker</li>
                <li className="skills-list-learning">Kubernetes</li>
                <li className="skills-list-learning">Ansible</li>
                <li className="skills-list-learning">Jenkins</li>
                <li className="skills-list-learning">Vagrant</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent">
              <h3>Tools</h3>
              <ul>
                <li className="skills-list-like">Git</li>
                <li className="skills-list-good">Jenkins</li>
                <li className="skills-list-good">Travis CI</li>
                <li className="skills-list-learning">Zabbix</li>
                <li className="skills-list-learning">Elk</li>
              </ul>
            </li>
            {/* SUB: Extra */}
          </ul>
        </div>
        {/* SECTION: */}
        <div className="skills-section">
          <div id="skills-header-parent">
            <h2>Programming</h2>
          </div>
          <ul className="skills-section-list">
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Languages / Scripting</h3>
              <ul>
                <li className="skills-list-like">Rust</li>
                <li className="skills-list-like">Python</li>
                <li className="skills-list-like">Golang</li>
                <li className="skills-list-like">C</li>
                <li className="skills-list-like">
                  Shell Scripts - bash/zsh/sh (not fish tho)
                </li>
                <li className="skills-list-like">Markdown</li>
                <li className="skills-list-good">Lua</li>
                <li className="skills-list-good">C++</li>
                <li className="skills-list-good">LaTeX</li>
                <li className="skills-list-learning">Java</li>
                <li className="skills-list-learning">Mobile Development</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
            {/* SUB: Extra */}
          </ul>
        </div>
        {/* SECTION: Linux*/}
        <div className="skills-section">
          <div id="skills-header-parent">
            <h2>Linux</h2>
          </div>
          <ul className="skills-section-list">
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Init Systems</h3>
              <ul>
                <li className="skills-list-good">Systemd</li>
                <li className="skills-list-good">OpenRC</li>
                <li className="skills-list-good">Runit</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Terminal</h3>
              <ul>
                <li className="skills-list-like">Vim</li>
                <li className="skills-list-good">Text Manipulation Tools </li>
                <li className="skills-list-good">Package Management</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Distributions</h3>
              <ul>
                <li className="skills-list-good">Debian</li>
                <li className="skills-list-good">Fedora</li>
                <li className="skills-list-good">Gentoo</li>
                <li className="skills-list-good">Arch</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent">
              <h3>Extra</h3>
              <ul>
                <li className="skills-list-good">IPC</li>
                <li className="skills-list-good">User Management</li>
                <li className="skills-list-good">OSS</li>
                <li className="skills-list-good">Filesystems</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Skills;
