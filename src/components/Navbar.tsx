import anime from 'animejs'
import React from 'react'
import { useEffect } from 'react'
import '../assets/Navbar.scss'
const animate = ()=>{
  const tl = anime.timeline()
  tl.add({
    targets: '#navbar-root',
    duration: 1000,
    translateX: [-100, 0],
    delay: 500,
    easing: "easeOutQuint"
  })
}

const Navbar: React.FC = () => {
  useEffect(()=>{
    animate();
  })
  return (
    <div id="navbar-root"><div>☰</div></div>
  )
}
export default Navbar
