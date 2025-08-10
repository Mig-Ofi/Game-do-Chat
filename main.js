// main.js - FPS 3D com bots que atiram - controle corrigido no botão iniciar

let scene, camera, renderer, controls;
let objects = [];
let bullets = [];
let bots = [];
let botBullets = [];

let move = {forward:false, backward:false, left:false, right:false};
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let clock = new THREE.Clock();

let canShoot = true;
const shootCooldown = 0.3;
const bulletSpeed = 60;
const bulletLife = 2;
const botShootCooldown = 1.5;

let kills = 0;

const statusEl = document.getElementById('status');

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

  // Piso com textura
  const textureLoader = new THREE.TextureLoader();
  const floorTexture = textureLoader.load('https://threejs.org/examples/textures/checker.png');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(10,10);
  floorTexture.anisotropy = 16;

  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  const floorMaterial = new THREE.MeshStandardMaterial({map: floorTexture});
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  objects.push(floor);

  // Obstáculos com textura
  const boxTexture = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');

  addObstacle(5,1,-5, boxTexture);
  addObstacle(-5,1,-5, boxTexture);
  addObstacle(0,1,5, boxTexture);
  addObstacle(-3,1,3, boxTexture);

  // Bots com textura vermelha
  for(let i=0; i<5; i++) spawnBot(boxTexture);

  // Controls
  controls = new THREE.PointerLockControls(camera, renderer.domElement);

  const startBtn = document.getElementById('startBtn');
  const instructions = document.getElementById('instructions');

  // Botão escurece ao clicar
  startBtn.addEventListener('mousedown', () => {
    startBtn.style.filter = 'brightness(0.6)';
  });
  startBtn.addEventListener('mouseup', () => {
    startBtn.style.filter = 'brightness(1)';
  });
  startBtn.addEventListener('mouseout', () => {
    startBtn.style.filter = 'brightness(1)';
  });

  startBtn.addEventListener('click', () => {
    console.log('Botão Começar clicado, tentando ativar pointer lock...');
    controls.lock();
  });

  controls.addEventListener('lock', () => {
    console.log('Pointer lock ativado!');
    instructions.style.display = 'none';
    addCrosshair();
    addHUD();
  });
  controls.addEventListener('unlock', () => {
    console.log('Pointer lock liberado!');
    instructions.style.display = 'flex';
    removeCrosshair();
    removeHUD();
  });

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('click', onMouseClick);
}

function addCrosshair(){
  if(document.getElementById('crosshair')) return;
  const crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  document.body.appendChild(crosshair);
}
function removeCrosshair(){
  const crosshair = document.getElementById('crosshair');
  if(crosshair) crosshair.remove();
}

function addHUD(){
  if(document.getElementById('hud')) return;
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.textContent = `Kills: ${kills}`;
  document.body.appendChild(hud);
}
function updateHUD(){
  const hud = document.getElementById('hud');
  if(hud) hud.textContent = `Kills: ${kills}`;
}
function removeHUD(){
  const hud = document.getElementById('hud');
  if(hud) hud.remove();
}

function addObstacle(x,y,z, texture){
  const geometry = new THREE.BoxGeometry(2,2,2);
  const material = new THREE.MeshStandardMaterial({map: texture});
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x,y,z);
  scene.add(box);
  objects.push(box);
}

function spawnBot(texture){
  const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
  const material = new THREE.MeshStandardMaterial({color: 0xff4444, map: texture});
  const bot = new THREE.Mesh(geometry, material);
  bot.position.set(
    (Math.random() - 0.5) * 40,
    1,
    (Math.random() - 0.5) * 40
  );
  bot.userData = {
    velocity: new THREE.Vector3(),
    shootTimer: 0
  };
  scene.add(bot);
  bots.push(bot);
}

function onWindowResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e){
  switch(e.code){
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.backward = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
  }
}
function onKeyUp(e){
  switch(e.code){
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.backward = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
}
function onMouseClick(){
  if(!controls.isLocked) return;
  if(!canShoot) return;
  canShoot = false;
  shoot();
  setTimeout(() => { canShoot = true; }, shootCooldown * 1000);
}
function shoot(){
  const bulletGeometry = new THREE.SphereGeometry(0.1,8,8);
  const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  const shootDirection = new THREE.Vector3();
  camera.getWorldDirection(shootDirection);

  bullet.position.copy(camera.position);
  bullet.userData = { velocity: shootDirection.multiplyScalar(bulletSpeed), life: bulletLife, fromBot:false };
  scene.add(bullet);
  bullets.push(bullet);
}

function animate(){
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

  // Atualiza projéteis do jogador
  for(let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.position.addScaledVector(b.userData.velocity, delta);
    b.userData.life -= delta;
    if(b.userData.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    } else {
      // Colisão com bots
      if(!b.userData.fromBot){
        for(let j = bots.length -1; j >= 0; j--) {
          const bot = bots[j];
          if(bot.position.distanceTo(b.position) < 0.5) {
            scene.remove(bot);
            bots.splice(j,1);
            scene.remove(b);
            bullets.splice(i,1);
            kills++;
            updateHUD();
            break;
          }
        }
      }
    }
  }

  // Atualiza bots e projéteis dos bots
  bots.forEach(bot => {
    // Bot patrulha aleatoriamente
    if(!bot.userData.direction || Math.random() < 0.02) {
      bot.userData.direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 2
      ).normalize();
    }
    bot.position.addScaledVector(bot.userData.direction, delta * 1.5);

    // Mantém bots no mapa
    bot.position.x = Math.min(24, Math.max(-24, bot.position.x));
    bot.position.z = Math.min(24, Math.max(-24, bot.position.z));

    // Bot atira no jogador se perto e cooldown zerado
    bot.userData.shootTimer -= delta;
    if(bot.userData.shootTimer <= 0){
      const dist = bot.position.distanceTo(camera.position);
      if(dist < 20){
        bot.userData.shootTimer = botShootCooldown;
        botShoot(bot);
      }
    }
  });

  // Atualiza projéteis dos bots
  for(let i = botBullets.length - 1; i >= 0; i--) {
    let b = botBullets[i];
    b.position.addScaledVector(b.userData.velocity, delta);
    b.userData.life -= delta;
    if(b.userData.life <= 0) {
      scene.remove(b);
      botBullets.splice(i, 1);
    } else {
      // Colisão com jogador
      if(b.position.distanceTo(camera.position) < 0.5){
        statusEl.textContent = 'Você foi atingido!';
        scene.remove(b);
        botBullets.splice(i,1);
      }
    }
  }

  renderer.render(scene, camera);
}

function botShoot(bot){
  const bulletGeometry = new THREE.SphereGeometry(0.1,8,8);
  const bulletMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  const dir = new THREE.Vector3();
  dir.subVectors(camera.position, bot.position).normalize();

  bullet.position.copy(bot.position);
  bullet.userData = { velocity: dir.multiplyScalar(bulletSpeed*0.8), life: bulletLife, fromBot:true };
  scene.add(bullet);
  botBullets.push(bullet);
}
