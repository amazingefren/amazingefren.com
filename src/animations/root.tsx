/*import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
// import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix 
    * modelViewMatrix 
    * vec4( position, 1.0 );
}
`;

const shader = `
uniform float amount;
uniform sampler2D tDiffuse;
varying vec2 vUv;

float random( vec2 p )
{
  vec2 K1 = vec2(
    23.14069263277926, // e^pi (Gelfond's constant)
    2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
  );
return fract( cos( dot(p,K1) ) * 12345.6789 );
}

void main() {
  vec4 color = texture2D( tDiffuse, vUv );
  vec2 uvRandom = vUv;
  uvRandom.y *= random(vec2(uvRandom.y,amount));
  color.rgb += random(uvRandom)*0.15;
  gl_FragColor = vec4( color );
}`;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });

const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

camera.position.setZ(30);
renderer.render(scene, camera);
renderer.setClearColor(0xffffff,0)

const pointLight = new THREE.PointLight(0xffffff, 0.8);
pointLight.position.set(5, 0, 20);
scene.add(pointLight);

const ambiLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambiLight);

// const geometry = new THREE.TorusGeometry(10,3,16,100)
// const material = new THREE.MeshStandardMaterial({color: 0xff0000})
// const torus = new THREE.Mesh(geometry, material);

// scene.add(torus)

// const lightHelper = new THREE.PointLightHelper(pointLight)
// scene.add(lightHelper)

// const axesHelper = new THREE.AxesHelper(200)
// scene.add(axesHelper)

// const gridHelper = new THREE.GridHelper(200)
// scene.add(gridHelper)

// const controls = new OrbitControls(camera, renderer.domElement)

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

let counter = 0;
const pass = new ShaderPass({
  uniforms: {
    "amount": {value: counter}
  },
  vertexShader: vertex,
  fragmentShader: shader,
});

pass.renderToScreen = true;
composer.addPass(pass);

const addStar = () => {
  const starGeo = new THREE.SphereGeometry(0.06, 24, 24);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const star = new THREE.Mesh(starGeo, starMat);

  const { x, y, z } = {
    x: THREE.MathUtils.randFloatSpread(100),
    y: THREE.MathUtils.randFloatSpread(100),
    z: THREE.MathUtils.randFloatSpread(100),
  };

  star.position.set(x, y, z);
  scene.add(star);
};

for (let i = 0; i < 500; i++) {
  addStar();
}


const animate = () => {
  requestAnimationFrame(animate);
  camera.rotateX(0.002);
  camera.rotateY(0.002);
  // controls.update()
  let timer = Date.now() * 0.0002;
  camera.position.x = Math.cos(timer) * 10;
  camera.position.z = Math.sin(timer) * 10;
  pass.uniforms["amount"].value = counter
  counter++;
  renderer.render(scene, camera);
  composer.render();
};

export default class {
  constructor() {}

  start = () => {
    const el = document
      .getElementById("root")
      ?.appendChild(renderer.domElement);
    // const el = document..appendChild(renderer.domElement)
    window.addEventListener("resize", handleResize, false);
    if (el) {
      el.id = "root-animation";
    }
    animate();

    // requestAnimationFrame(this.animate);
    // this.renderer.render(this.scene, this.camera);
  };
}*/
