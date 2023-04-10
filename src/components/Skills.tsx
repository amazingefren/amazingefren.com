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
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Technologies</h3>
              <ul>
                <li className="skills-list-like">Typescript</li>
                <li className="skills-list-good">Javascript</li>
                <li className="skills-list-good">HTML5</li>
                <li className="skills-list-good">CSS / SASS</li>
                <li className="skills-list-learning">WebGL (wip)</li>
                <li className="skills-list-learning">Web Assembly</li>
              </ul>
            </li>
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Frameworks</h3>
              <ul>
                <li className="skills-list-like">React</li>
                <li className="skills-list-like">GatsbyJS</li>
                <li className="skills-list-good">Next.js</li>
                <li className="skills-list-good">jQuery</li>
                <li className="skills-list-good">Vue.js</li>
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
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Node.js</h3>
              <ul>
                <li className="skills-list-like">Express</li>
                <li className="skills-list-like">Fastify</li>
                <li className="skills-list-like">Koa</li>
                <li className="skills-list-like">NestJS</li>
              </ul>
            </li>
            {/* SUB: Design */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Design Patterns</h3>
              <ul>
                <li className="skills-list-good">REST / CRUD</li>
                <li className="skills-list-good">GraphQL</li>
                <li className="skills-list-good">User Authentication</li>
                <li className="skills-list-good">Session Management</li>
              </ul>
            </li>
            {/* SUB: Database */}
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Database</h3>
              <ul>
                <li className="skills-list-like">PostgreSQL</li>
                <li className="skills-list-like">MySQL</li>
                <li className="skills-list-good">MongoDB</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Extra</h3>
              <ul>
                <li className="skills-list-like">Rust - Actix Web (The Server)</li>
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
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Deployment</h3>
              <ul>
                <li className="skills-list-good">CI/CD</li>
                <li className="skills-list-good">TCP/IP Fundamentals</li>
                <li className="skills-list-good">Network Protocols</li>
                <li className="skills-list-good">Redis</li>
                <li className="skills-list-learning">Security</li>
              </ul>
            </li>
            {/* SUB: Infrastructure */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Infrastructure</h3>
              <ul>
                <li className="skills-list-like">NGINX</li>
                <li className="skills-list-like">Apache</li>
                <li className="skills-list-good">Amazon AWS</li>
                <li className="skills-list-learning">Microsoft Azure</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">IaC Skills</h3>
              <ul>
                <li className="skills-list-like">Docker</li>
                <li className="skills-list-like">Ansible</li>
                <li className="skills-list-learning">Jenkins</li>
                <li className="skills-list-learning">Kubernetes</li>
                <li className="skills-list-learning">Vagrant</li>
              </ul>
            </li>
            {/* SUB: Automation / Virtualization */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Tools</h3>
              <ul>
                <li className="skills-list-like">Git</li>
                <li className="skills-list-good">Zabbix</li>
                <li className="skills-list-good">Jenkins</li>
                <li className="skills-list-good">Travis CI</li>
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
            <li className="skills-section-list-parent skills-section-list-parent-both">
              <h3 id="skills-section-header-both" className="skills-section-header-round-left">Languages / Scripting</h3>
              <ul>
                <li className="skills-list-like">Rust (The Game)</li>
                <li className="skills-list-dislike">I'm not affiliated with the rust foundation, any references to rust, the rust language or ferris the crab have not been approved by the foundation</li>
                <li className="skills-list-like">Python</li>
                <li className="skills-list-like">Golang</li>
                <li className="skills-list-like">C</li>
                <li className="skills-list-like">
                  Shell Scripts
                </li>
                <li className="skills-list-like">Markdown</li>
                <li className="skills-list-good">Lua</li>
                <li className="skills-list-good">C++</li>
                <li className="skills-list-good">LaTeX</li>
                <li className="skills-list-good">Java</li>
                <li className="skills-list-good">Mobile Development</li>
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
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Init Systems</h3>
              <ul>
                <li className="skills-list-good">Systemd</li>
                <li className="skills-list-good">OpenRC</li>
                <li className="skills-list-good">Runit</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Terminal</h3>
              <ul>
                <li className="skills-list-like">Vim / Neovim</li>
                <li className="skills-list-good">Text Manipulation Tools</li>
                <li className="skills-list-good">Package Management</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent skills-section-list-parent-left">
              <h3 className="skills-section-header-round-left">Distributions</h3>
              <ul>
                <li className="skills-list-good">Debian</li>
                <li className="skills-list-good">Fedora</li>
                <li className="skills-list-good">Gentoo</li>
                <li className="skills-list-good">Arch</li>
              </ul>
            </li>
            {/* SUB: Extra */}
            <li className="skills-section-list-parent skills-section-list-parent-right">
              <h3 className="skills-section-header-round-right">Extra</h3>
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
