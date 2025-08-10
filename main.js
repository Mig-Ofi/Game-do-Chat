// main.js - FPS 3D básico com Three.js

let scene, camera, renderer, controls;
let objects = [];
let bullets = [];
let bots = [];
let move = {forward:false, backward:false, left:false, right:false};
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let clock = new THREE.Clock();
let canShoot = true;
const shootCooldown = 0.3;
const bulletSpeed = 60;
const bulletLife = 2;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 0);

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 10, 6);
  scene.add(directionalLight);

  // Piso
  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  const floorMaterial = new THREE.MeshStandardMaterial({color: 0x444444});
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  objects.push(floor);

  // Obstáculos
  addObstacle(5, 1, -5);
  addObstacle(-5, 1, -5);
  addObstacle(0, 1, 5);
  addObstacle(-3, 1, 3);

  // Bots
  for(let i=0; i<5; i++) spawnBot();

  // Controls
  controls = new THREE.PointerLockControls(camera, renderer.domElement);

  document.getElementById('startBtn').addEventListener('click', () => {
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    document.getElementById('instructions').style.display = 'none';
  });
  controls.addEventListener('unlock', () => {
    document.getElementById('instructions').style.display = 'flex';
  });

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('click', onMouseClick);
}

function addObstacle(x,y,z) {
  const geometry = new THREE.BoxGeometry(2,2,2);
  const material = new THREE.MeshStandardMaterial({color:0x888888});
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x,y,z);
  scene.add(box);
  objects.push(box);
}

function spawnBot() {
  const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
  const material = new THREE.MeshStandardMaterial({color: 0xff4444});
  const bot = new THREE.Mesh(geometry, material);
  bot.position.set(
    (Math.random() - 0.5) * 40,
    1,
    (Math.random() - 0.5) * 40
  );
  bot.userData = { velocity: new THREE.Vector3() };
  scene.add(bot);
  bots.push(bot);
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  switch(e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
  }
}

function onKeyUp(e) {
  switch(e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.backward = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
}

function onMouseClick() {
  if(!controls.isLocked) return;
  if(!canShoot) return;
  canShoot = false;
  shoot();
  setTimeout(() => { canShoot = true; }, shootCooldown * 1000);
}

function shoot() {
  const bulletGeometry = new THREE.SphereGeometry(0.1,8,8);
  const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  const shootDirection = new THREE.Vector3();
  camera.getWorldDirection(shootDirection);

  bullet.position.copy(camera.position);
  bullet.userData = { velocity: shootDirection.multiplyScalar(bulletSpeed), life: bulletLife };
  scene.add(bullet);
  bullets.push(bullet);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(move.forward) - Number(move.backward);
  direction.x = Number(move.right) - Number(move.left);
  direction.normalize();

  if(move.forward || move.backward) velocity.z -= direction.z * 40.0 * delta;
  if(move.left || move.right) velocity.x -= direction.x * 40.0 * delta;

  controls.moveRight(-velocity.x * delta);
  controls.moveForward(-velocity.z * delta);

  // Atualiza projéteis
  for(let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.position.addScaledVector(b.userData.velocity, delta);
    b.userData.life -= delta;
    if(b.userData.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    } else {
      // Colisão simples com bots
      for(let j = bots.length -1; j>=0; j--) {
        const bot = bots[j];
        if(bot.position.distanceTo(b.position) < 0.5) {
          scene.remove(bot);
          bots.splice(j,1);
          scene.remove(b);
          bullets.splice(i,1);
          break;
        }
      }
    }
  }

  // Atualiza bots (andando aleatório simples)
  bots.forEach(bot => {
    if(!bot.userData.direction || Math.random() < 0.02) {
      bot.userData.direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize();
    }
    bot.position.addScaledVector(bot.userData.direction, delta * 1.5);

    // Mantém dentro do mapa
    bot.position.x = Math.min(24, Math.max(-24, bot.position.x));
    bot.position.z = Math.min(24, Math.max(-24, bot.position.z));
  });

  renderer.render(scene, camera);
                          }
