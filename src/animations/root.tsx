import * as THREE from 'three'

export default class {
  // Foundation
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.Renderer;

  constructor(){
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    this.scene.add( cube );
    this.camera.position.z = 5;
    window.addEventListener('resize', this.resize, false);
    const root = document.getElementById('root')

    if (root){
      const child = root.appendChild(this.renderer.domElement)
      child.id='root-animation';
    }
  }

  private resize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  animate = () =>{
    requestAnimationFrame(this.animate);
    this.scene.rotateY(0.01)
    this.renderer.render(this.scene, this.camera)
  }
}
