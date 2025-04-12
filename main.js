import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Preload all assets
const ASSETS_TO_PRELOAD = ['space.jpg', 'jeff.png', 'moon.jpg', 'normal.jpg'];
let assetsLoaded = 0;
const assetLoader = new THREE.LoadingManager(
  // onLoad
  function() {
    console.log('All assets loaded successfully');
    init(); // Initialize the scene after assets are loaded
  },
  // onProgress
  function(url, itemsLoaded, itemsTotal) {
    console.log(`Loaded ${itemsLoaded}/${itemsTotal}: ${url}`);
    assetsLoaded = itemsLoaded;
  },
  // onError
  function(url) {
    console.error(`Error loading asset: ${url}`);
    // Continue anyway after a delay
    if (assetsLoaded === ASSETS_TO_PRELOAD.length - 1) {
      console.log('Continuing with available assets');
      setTimeout(init, 500);
    }
  }
);

// Create texture loaders
const textureLoader = new THREE.TextureLoader(assetLoader);
const textures = {};

// Preload all textures
ASSETS_TO_PRELOAD.forEach(asset => {
  textureLoader.load(asset, function(texture) {
    textures[asset] = texture;
  });
});

// Setup variables
let scene, camera, renderer, torus, jeff, moon;
let animationStarted = false;

function init() {
  // Setup
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
  });
  
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.setZ(30);
  camera.position.setX(-3);
  
  renderer.render(scene, camera);
  
  // Set the background if loaded
  if (textures['space.jpg']) {
    scene.background = textures['space.jpg'];
  } else {
    // Fallback background
    scene.background = new THREE.Color(0x050505);
  }
  
  // Create the torus
  const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
  const material = new THREE.MeshStandardMaterial({ color: 0xff6347 });
  torus = new THREE.Mesh(geometry, material);
  scene.add(torus);
  
  // Lights
  const pointLight = new THREE.PointLight(0xffffff);
  pointLight.position.set(5, 5, 5);
  
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(pointLight, ambientLight);
  
  // Add stars
  function addStar() {
    const geometry = new THREE.SphereGeometry(0.25, 24, 24);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);
  
    const [x, y, z] = Array(3)
      .fill()
      .map(() => THREE.MathUtils.randFloatSpread(100));
  
    star.position.set(x, y, z);
    scene.add(star);
  }
  
  Array(200).fill().forEach(addStar);
  
  // Create Jeff - avatar with texture
  jeff = new THREE.Mesh(
    new THREE.BoxGeometry(3, 3, 3),
    new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      map: textures['jeff.png'] || null
    })
  );
  scene.add(jeff);
  
  // Create the Moon
  moon = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 32),
    new THREE.MeshStandardMaterial({
      map: textures['moon.jpg'] || null,
      normalMap: textures['normal.jpg'] || null,
    })
  );
  scene.add(moon);
  
  // Set positions
  moon.position.z = 30;
  moon.position.setX(-10);
  
  jeff.position.z = -5;
  jeff.position.x = 2;
  
  // Set initial scales
  torus.scale.set(1, 1, 1);
  moon.scale.set(1, 1, 1);
  jeff.scale.set(1, 1, 1);
  
  // Mobile performance optimizations
  checkPerformance();
  
  // Adjust camera for orientation
  adjustCameraForOrientation();
  
  // Start the animation loop
  animationStarted = true;
  animate();
  
  // Add event listeners
  window.addEventListener('resize', onWindowResize);
  document.body.onscroll = moveCamera;
  
  // Initial camera placement
  moveCamera();
}

// Mobile performance optimizations
function checkPerformance() {
  // Detect if we're on a mobile or low-performance device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowPerformance = window.innerWidth < 768 || isMobile;
  
  if (isLowPerformance && scene && torus && moon && jeff) {
    // Reduce the number of stars for better performance
    scene.children.forEach(child => {
      if (child.isMesh && child !== torus && child !== jeff && child !== moon) {
        scene.remove(child);
      }
    });
    
    // Add fewer stars back - even fewer on very small screens
    const starCount = window.innerWidth < 480 ? 25 : 50;
    
    // Only if addStar is available in this scope
    function addStar() {
      const geometry = new THREE.SphereGeometry(0.25, 24, 24);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const star = new THREE.Mesh(geometry, material);
    
      const [x, y, z] = Array(3)
        .fill()
        .map(() => THREE.MathUtils.randFloatSpread(100));
    
      star.position.set(x, y, z);
      scene.add(star);
    }
    
    Array(starCount).fill().forEach(addStar);
    
    // Use consistent scaling - important for mobile to avoid size issues
    const mobileScale = 0.85;
    torus.scale.set(mobileScale, mobileScale, mobileScale);
    moon.scale.set(mobileScale, mobileScale, mobileScale);
    jeff.scale.set(mobileScale, mobileScale, mobileScale);
    
    // Adjust positions for better mobile viewing
    moon.position.z = 25;
    moon.position.x = -8;
    
    // Reduce geometric complexity
    torus.geometry.dispose();
    const segments = window.innerWidth < 480 ? 6 : 8;
    const tubularSegments = window.innerWidth < 480 ? 30 : 50;
    torus.geometry = new THREE.TorusGeometry(10, 3, segments, tubularSegments);
    
    // Reduce render quality for better performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  }
}

// Adjust camera for screen orientation
function adjustCameraForOrientation() {
  if (!camera) return;
  
  const isPortrait = window.innerHeight > window.innerWidth;
  
  if (isPortrait) {
    // Pull camera back a bit for better portrait view
    camera.position.z = 40;
    camera.position.y = 5;
  } else {
    // Default landscape position
    camera.position.z = 30;
    camera.position.y = 0;
  }
  
  camera.updateProjectionMatrix();
}

// Limit scale changes during scroll to fix sizing issues
function moveCamera() {
  if (!camera || !moon || !jeff || !torus) return;
  
  const t = document.body.getBoundingClientRect().top;
  
  // Scale the rotation effects based on device size for smoother animation
  const scaleFactor = window.innerWidth < 768 ? 0.7 : 1.0;
  
  // Rotations
  moon.rotation.x += 0.05 * scaleFactor;
  moon.rotation.y += 0.075 * scaleFactor;
  moon.rotation.z += 0.05 * scaleFactor;

  jeff.rotation.y += 0.01 * scaleFactor;
  jeff.rotation.z += 0.01 * scaleFactor;

  // IMPORTANT: Use clamped, limited scaling to prevent objects from becoming too large
  // This fixes the issue where 3D elements become large when scrolling
  const baseScale = window.innerWidth < 768 ? 0.85 : 1.0;
  const maxScaleChange = 0.1; // Limit scale change to 10%
  
  // Calculate scroll percentage in a limited range
  const scrollPercent = Math.max(-1, Math.min(0, t / 2000));
  const scaleAdjustment = scrollPercent * maxScaleChange;
  
  // Apply the limited scale
  const newScale = baseScale + scaleAdjustment;
  moon.scale.set(newScale, newScale, newScale);
  jeff.scale.set(newScale, newScale, newScale);
  torus.scale.set(newScale, newScale, newScale);
  
  // Limit camera movement for smoother experience
  const zPosition = Math.max(-50, Math.min(50, t * -0.01));
  const xPosition = Math.max(-20, Math.min(20, t * -0.0002));
  const yRotation = Math.max(-Math.PI/6, Math.min(Math.PI/6, t * -0.0002));
  
  camera.position.z = zPosition;
  camera.position.x = xPosition;
  camera.rotation.y = yRotation;
}

// Animation Loop with improved stability
let lastTime = 0;
const targetFPS = window.innerWidth < 768 ? 30 : 60; // Lower target FPS on mobile
const frameInterval = 1000 / targetFPS;

function animate(currentTime = 0) {
  if (!animationStarted) return;
  
  requestAnimationFrame(animate);
  
  // Throttle framerate on mobile
  const deltaTime = currentTime - lastTime;
  if (deltaTime < frameInterval) return;
  
  lastTime = currentTime - (deltaTime % frameInterval);
  
  // Ensure objects maintain proper scale
  const baseScale = window.innerWidth < 768 ? 0.85 : 1.0;
  
  // Check if objects have been improperly scaled
  if (moon && (moon.scale.x < 0.5 || moon.scale.x > 2.0)) {
    moon.scale.set(baseScale, baseScale, baseScale);
  }
  
  if (jeff && (jeff.scale.x < 0.5 || jeff.scale.x > 2.0)) {
    jeff.scale.set(baseScale, baseScale, baseScale);
  }
  
  if (torus && (torus.scale.x < 0.5 || torus.scale.x > 2.0)) {
    torus.scale.set(baseScale, baseScale, baseScale);
  }
  
  // Apply rotations
  if (torus) {
    torus.rotation.x += 0.01;
    torus.rotation.y += 0.005;
    torus.rotation.z += 0.01;
  }
  
  if (moon) {
    moon.rotation.x += 0.005;
  }
  
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Handle window resize properly
function onWindowResize() {
  if (!camera || !renderer) return;
  
  // Update camera aspect
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  
  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Re-run performance checks
  checkPerformance();
  
  // Adjust camera based on orientation
  adjustCameraForOrientation();
}

// Start loading the assets
// This will trigger init() when complete
console.log("Starting asset loading...");
