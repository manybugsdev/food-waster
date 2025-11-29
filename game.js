import * as THREE from 'three';

// Game Constants
const ARENA_SIZE = 50;
const PLAYER_SPEED = 0.15;
const JUMP_FORCE = 0.3;
const GRAVITY = 0.01;
const THROW_SPEED = 0.8;
const MAX_HEALTH = 100;
const FOOD_DAMAGE = 10;
const CPU_THROW_INTERVAL = 2000;
const CPU_MOVE_INTERVAL = 100;

// Food Types
const FOOD_TYPES = [
    { name: 'ピザ', emoji: '🍕', color: 0xffa500, damage: 10 },
    { name: 'ハンバーガー', emoji: '🍔', color: 0x8b4513, damage: 12 },
    { name: 'りんご', emoji: '🍎', color: 0xff0000, damage: 8 },
    { name: 'バナナ', emoji: '🍌', color: 0xffff00, damage: 7 },
    { name: 'すいか', emoji: '🍉', color: 0x00ff00, damage: 15 },
    { name: 'ケーキ', emoji: '🍰', color: 0xffb6c1, damage: 11 },
    { name: 'アイス', emoji: '🍦', color: 0xfffacd, damage: 9 },
    { name: 'たこ焼き', emoji: '🐙', color: 0x8b0000, damage: 13 },
];

// Game State
let scene, camera, renderer;
let player, cpu;
let projectiles = [];
let gameStarted = false;
let gameOver = false;
let playerScore = 0;
let cpuScore = 0;
let playerHealth = MAX_HEALTH;
let cpuHealth = MAX_HEALTH;
let currentFoodIndex = 0;

// Input State
const keys = {};
let mouseX = 0;
let mouseY = 0;
let isPointerLocked = false;

// Physics
let playerVelocityY = 0;
let isOnGround = true;

// CPU AI State
let cpuTargetPosition = new THREE.Vector3();
let cpuLastThrowTime = 0;
let cpuLastMoveTime = 0;

// Initialize the game
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').insertBefore(renderer.domElement, document.getElementById('ui-overlay'));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Create Arena
    createArena();

    // Create Player
    createPlayer();

    // Create CPU
    createCPU();

    // Add decorations
    createDecorations();

    // Event Listeners
    setupEventListeners();

    // Start animation loop
    animate();
}

function createArena() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7cfc00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Checkerboard pattern
    const checkerSize = 5;
    for (let x = -ARENA_SIZE / 2; x < ARENA_SIZE / 2; x += checkerSize) {
        for (let z = -ARENA_SIZE / 2; z < ARENA_SIZE / 2; z += checkerSize) {
            if ((Math.floor(x / checkerSize) + Math.floor(z / checkerSize)) % 2 === 0) {
                const tile = new THREE.Mesh(
                    new THREE.PlaneGeometry(checkerSize, checkerSize),
                    new THREE.MeshLambertMaterial({ color: 0x90ee90 })
                );
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x + checkerSize / 2, 0.01, z + checkerSize / 2);
                tile.receiveShadow = true;
                scene.add(tile);
            }
        }
    }

    // Walls
    const wallHeight = 5;
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA_SIZE, wallHeight, 1),
        wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -ARENA_SIZE / 2);
    northWall.receiveShadow = true;
    northWall.castShadow = true;
    scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA_SIZE, wallHeight, 1),
        wallMaterial
    );
    southWall.position.set(0, wallHeight / 2, ARENA_SIZE / 2);
    southWall.receiveShadow = true;
    southWall.castShadow = true;
    scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, ARENA_SIZE),
        wallMaterial
    );
    eastWall.position.set(ARENA_SIZE / 2, wallHeight / 2, 0);
    eastWall.receiveShadow = true;
    eastWall.castShadow = true;
    scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, ARENA_SIZE),
        wallMaterial
    );
    westWall.position.set(-ARENA_SIZE / 2, wallHeight / 2, 0);
    westWall.receiveShadow = true;
    westWall.castShadow = true;
    scene.add(westWall);
}

function createPlayer() {
    player = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    player.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdab9 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    player.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 2.1, 0.35);
    player.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 2.1, 0.35);
    player.add(rightEye);

    player.position.set(0, 0, 15);
    scene.add(player);
}

function createCPU() {
    cpu = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff4500 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    cpu.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdab9 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    cpu.add(head);

    // Evil eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 2.1, 0.35);
    cpu.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 2.1, 0.35);
    cpu.add(rightEye);

    // CPU label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff4500';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CPU', 128, 48);
    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.SpriteMaterial({ map: texture });
    const label = new THREE.Sprite(labelMaterial);
    label.position.y = 3;
    label.scale.set(2, 0.5, 1);
    cpu.add(label);

    cpu.position.set(0, 0, -15);
    scene.add(cpu);
}

function createDecorations() {
    // Trees
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = ARENA_SIZE / 2 + 5;
        createTree(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
        );
    }

    // Clouds
    for (let i = 0; i < 5; i++) {
        createCloud(
            (Math.random() - 0.5) * 80,
            20 + Math.random() * 10,
            (Math.random() - 0.5) * 80
        );
    }

    // Food stands
    createFoodStand(-15, 0);
    createFoodStand(15, 0);
}

function createTree(x, z) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Leaves
    const leavesGeometry = new THREE.SphereGeometry(2.5, 8, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 5;
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    scene.add(tree);
}

function createCloud(x, y, z) {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 5; i++) {
        const sphereGeometry = new THREE.SphereGeometry(1 + Math.random(), 8, 8);
        const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
        sphere.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 1,
            (Math.random() - 0.5) * 2
        );
        cloud.add(sphere);
    }

    cloud.position.set(x, y, z);
    scene.add(cloud);
}

function createFoodStand(x, z) {
    const stand = new THREE.Group();

    // Counter
    const counterGeometry = new THREE.BoxGeometry(4, 1.5, 2);
    const counterMaterial = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const counter = new THREE.Mesh(counterGeometry, counterMaterial);
    counter.position.y = 0.75;
    counter.castShadow = true;
    counter.receiveShadow = true;
    stand.add(counter);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(3, 2, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0xff6347 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 3.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    stand.add(roof);

    // Poles
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
    
    const pole1 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole1.position.set(-1.5, 2, 0.8);
    stand.add(pole1);
    
    const pole2 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole2.position.set(1.5, 2, 0.8);
    stand.add(pole2);
    
    const pole3 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole3.position.set(-1.5, 2, -0.8);
    stand.add(pole3);
    
    const pole4 = new THREE.Mesh(poleGeometry, poleMaterial);
    pole4.position.set(1.5, 2, -0.8);
    stand.add(pole4);

    stand.position.set(x, 0, z);
    scene.add(stand);
}

function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        if (gameStarted && !gameOver) {
            if (e.code === 'KeyQ') {
                currentFoodIndex = (currentFoodIndex - 1 + FOOD_TYPES.length) % FOOD_TYPES.length;
                updateFoodIndicator();
            } else if (e.code === 'KeyE') {
                currentFoodIndex = (currentFoodIndex + 1) % FOOD_TYPES.length;
                updateFoodIndicator();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked) {
            mouseX += e.movementX * 0.002;
            mouseY -= e.movementY * 0.002;
            mouseY = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, mouseY));
        }
    });

    // Mouse click
    document.addEventListener('click', (e) => {
        if (gameStarted && !gameOver && isPointerLocked) {
            throwFood(player, true);
        }
    });

    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameStarted && !gameOver) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', startGame);

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    playerScore = 0;
    cpuScore = 0;
    playerHealth = MAX_HEALTH;
    cpuHealth = MAX_HEALTH;
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('score-panel').style.display = 'block';
    document.getElementById('health-bar').style.display = 'block';
    document.getElementById('controls-panel').style.display = 'block';
    document.getElementById('food-indicator').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    
    updateScoreDisplay();
    updateHealthDisplay();
    updateFoodIndicator();
    
    renderer.domElement.requestPointerLock();
}

function restartGame() {
    // Reset positions
    player.position.set(0, 0, 15);
    cpu.position.set(0, 0, -15);
    
    // Clear projectiles
    projectiles.forEach(p => scene.remove(p.mesh));
    projectiles = [];
    
    // Reset state
    playerVelocityY = 0;
    isOnGround = true;
    mouseX = 0;
    mouseY = 0;
    cpuTargetPosition = new THREE.Vector3();
    cpuLastThrowTime = 0;
    cpuLastMoveTime = 0;
    
    document.getElementById('game-over').style.display = 'none';
    startGame();
}

function throwFood(thrower, isPlayer) {
    const foodType = FOOD_TYPES[isPlayer ? currentFoodIndex : Math.floor(Math.random() * FOOD_TYPES.length)];
    
    // Create food projectile
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshLambertMaterial({ color: foodType.color });
    const food = new THREE.Mesh(geometry, material);
    food.castShadow = true;
    
    // Set initial position
    const startPos = thrower.position.clone();
    startPos.y += 1.5;
    food.position.copy(startPos);
    
    // Calculate velocity
    let velocity;
    if (isPlayer) {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        direction.y = Math.sin(mouseY);
        direction.normalize();
        velocity = direction.multiplyScalar(THROW_SPEED);
    } else {
        // CPU aims at player with some randomness
        const targetPos = player.position.clone();
        targetPos.y += 1;
        
        // CPU predicts player movement based on observed input keys
        // This is intentional - CPU can "see" player moving and predict their trajectory
        if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
            const prediction = new THREE.Vector3();
            if (keys['KeyW']) prediction.z -= 0.5;
            if (keys['KeyS']) prediction.z += 0.5;
            if (keys['KeyA']) prediction.x -= 0.5;
            if (keys['KeyD']) prediction.x += 0.5;
            prediction.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
            targetPos.add(prediction.multiplyScalar(2));
        }
        
        // Add randomness
        targetPos.x += (Math.random() - 0.5) * 3;
        targetPos.y += (Math.random() - 0.5) * 1;
        targetPos.z += (Math.random() - 0.5) * 3;
        
        const direction = targetPos.sub(startPos).normalize();
        velocity = direction.multiplyScalar(THROW_SPEED * 0.9);
    }
    
    scene.add(food);
    
    projectiles.push({
        mesh: food,
        velocity: velocity,
        isPlayerProjectile: isPlayer,
        damage: foodType.damage,
        type: foodType
    });
    
    // Play throw sound effect (visual feedback instead)
    createThrowEffect(startPos, foodType.color);
}

function createThrowEffect(position, color) {
    const particleCount = 10;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            Math.random() * 0.2,
            (Math.random() - 0.5) * 0.2
        );
        particle.life = 30;
        scene.add(particle);
        particles.push(particle);
    }
    
    // Animate particles
    function animateParticles() {
        particles.forEach((particle, index) => {
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.005;
            particle.life--;
            particle.material.opacity = particle.life / 30;
            
            if (particle.life <= 0) {
                scene.remove(particle);
                particles.splice(index, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    animateParticles();
}

function createHitEffect(position, color) {
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.3,
            (Math.random() - 0.5) * 0.4
        );
        particle.life = 40;
        scene.add(particle);
        particles.push(particle);
    }
    
    function animateParticles() {
        particles.forEach((particle, index) => {
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.008;
            particle.life--;
            particle.material.opacity = particle.life / 40;
            particle.scale.multiplyScalar(0.98);
            
            if (particle.life <= 0) {
                scene.remove(particle);
                particles.splice(index, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animateParticles);
        }
    }
    animateParticles();
}

function updatePlayer() {
    if (!gameStarted || gameOver) return;
    
    // Movement direction based on camera rotation
    const moveDirection = new THREE.Vector3();
    
    if (keys['KeyW']) moveDirection.z -= 1;
    if (keys['KeyS']) moveDirection.z += 1;
    if (keys['KeyA']) moveDirection.x -= 1;
    if (keys['KeyD']) moveDirection.x += 1;
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseX);
        moveDirection.multiplyScalar(PLAYER_SPEED);
        
        // Apply movement
        player.position.x += moveDirection.x;
        player.position.z += moveDirection.z;
    }
    
    // Jump
    if (keys['Space'] && isOnGround) {
        playerVelocityY = JUMP_FORCE;
        isOnGround = false;
    }
    
    // Apply gravity
    playerVelocityY -= GRAVITY;
    player.position.y += playerVelocityY;
    
    if (player.position.y <= 0) {
        player.position.y = 0;
        playerVelocityY = 0;
        isOnGround = true;
    }
    
    // Keep player in bounds
    const bound = ARENA_SIZE / 2 - 1;
    player.position.x = Math.max(-bound, Math.min(bound, player.position.x));
    player.position.z = Math.max(-bound, Math.min(bound, player.position.z));
    
    // Update camera
    camera.position.copy(player.position);
    camera.position.y += 2;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
    
    // Rotate player body to match camera direction
    player.rotation.y = mouseX;
}

function updateCPU() {
    if (!gameStarted || gameOver) return;
    
    const now = Date.now();
    
    // CPU Movement AI
    if (now - cpuLastMoveTime > CPU_MOVE_INTERVAL) {
        cpuLastMoveTime = now;
        
        // Calculate direction to player for facing
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, cpu.position);
        toPlayer.y = 0;
        
        // Face the player
        if (toPlayer.length() > 0.1) {
            const angle = Math.atan2(toPlayer.x, toPlayer.z);
            cpu.rotation.y = angle;
        }
        
        // Move strategically
        const distanceToPlayer = toPlayer.length();
        
        // Random target position change
        if (Math.random() < 0.1) {
            cpuTargetPosition.set(
                (Math.random() - 0.5) * (ARENA_SIZE - 10),
                0,
                (Math.random() - 0.5) * (ARENA_SIZE - 10)
            );
        }
        
        // If player is too close, move away
        if (distanceToPlayer < 8) {
            cpuTargetPosition.copy(cpu.position);
            cpuTargetPosition.sub(toPlayer.normalize().multiplyScalar(10));
        }
        // If player is too far, move closer
        else if (distanceToPlayer > 20) {
            cpuTargetPosition.copy(player.position);
            cpuTargetPosition.add(toPlayer.normalize().multiplyScalar(-10));
        }
        
        // Move towards target
        const toTarget = new THREE.Vector3();
        toTarget.subVectors(cpuTargetPosition, cpu.position);
        toTarget.y = 0;
        
        if (toTarget.length() > 1) {
            toTarget.normalize();
            cpu.position.x += toTarget.x * PLAYER_SPEED * 0.7;
            cpu.position.z += toTarget.z * PLAYER_SPEED * 0.7;
        }
        
        // Random dodge
        if (Math.random() < 0.05) {
            cpu.position.x += (Math.random() - 0.5) * 2;
            cpu.position.z += (Math.random() - 0.5) * 2;
        }
        
        // Keep CPU in bounds
        const bound = ARENA_SIZE / 2 - 1;
        cpu.position.x = Math.max(-bound, Math.min(bound, cpu.position.x));
        cpu.position.z = Math.max(-bound, Math.min(bound, cpu.position.z));
    }
    
    // CPU Throwing AI
    if (now - cpuLastThrowTime > CPU_THROW_INTERVAL) {
        cpuLastThrowTime = now;
        
        // More aggressive when health is low
        const aggression = 1 - (cpuHealth / MAX_HEALTH) * 0.5;
        
        if (Math.random() < 0.5 + aggression * 0.3) {
            throwFood(cpu, false);
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        
        // Apply velocity
        projectile.mesh.position.add(projectile.velocity);
        
        // Apply gravity
        projectile.velocity.y -= GRAVITY * 0.5;
        
        // Rotate projectile
        projectile.mesh.rotation.x += 0.1;
        projectile.mesh.rotation.y += 0.1;
        
        // Check collision with player
        if (!projectile.isPlayerProjectile) {
            const distToPlayer = projectile.mesh.position.distanceTo(
                new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z)
            );
            if (distToPlayer < 1) {
                playerHealth -= projectile.damage;
                cpuScore += projectile.damage;
                createHitEffect(projectile.mesh.position.clone(), projectile.type.color);
                scene.remove(projectile.mesh);
                projectiles.splice(i, 1);
                updateScoreDisplay();
                updateHealthDisplay();
                checkGameOver();
                continue;
            }
        }
        
        // Check collision with CPU
        if (projectile.isPlayerProjectile) {
            const distToCPU = projectile.mesh.position.distanceTo(
                new THREE.Vector3(cpu.position.x, cpu.position.y + 1, cpu.position.z)
            );
            if (distToCPU < 1) {
                cpuHealth -= projectile.damage;
                playerScore += projectile.damage;
                createHitEffect(projectile.mesh.position.clone(), projectile.type.color);
                scene.remove(projectile.mesh);
                projectiles.splice(i, 1);
                updateScoreDisplay();
                updateHealthDisplay();
                checkGameOver();
                continue;
            }
        }
        
        // Remove if out of bounds or below ground
        if (projectile.mesh.position.y < -5 ||
            Math.abs(projectile.mesh.position.x) > ARENA_SIZE ||
            Math.abs(projectile.mesh.position.z) > ARENA_SIZE) {
            scene.remove(projectile.mesh);
            projectiles.splice(i, 1);
        }
    }
}

function updateScoreDisplay() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('cpu-score').textContent = cpuScore;
}

function updateHealthDisplay() {
    const playerPercent = Math.max(0, playerHealth / MAX_HEALTH * 100);
    const cpuPercent = Math.max(0, cpuHealth / MAX_HEALTH * 100);
    
    document.getElementById('player-health-fill').style.width = playerPercent + '%';
    document.getElementById('cpu-health-fill').style.width = cpuPercent + '%';
}

function updateFoodIndicator() {
    const food = FOOD_TYPES[currentFoodIndex];
    document.getElementById('current-food').textContent = `${food.emoji} ${food.name}`;
}

function checkGameOver() {
    if (playerHealth <= 0) {
        endGame(false);
    } else if (cpuHealth <= 0) {
        endGame(true);
    }
}

function endGame(playerWon) {
    gameOver = true;
    document.exitPointerLock();
    
    const gameOverDiv = document.getElementById('game-over');
    const title = document.getElementById('game-over-title');
    const message = document.getElementById('game-over-message');
    
    if (playerWon) {
        title.textContent = '🎉 勝利！ 🎉';
        title.style.color = '#00ff88';
        message.innerHTML = `おめでとう！CPUを倒しました！<br>スコア: ${playerScore}`;
    } else {
        title.textContent = '💔 敗北... 💔';
        title.style.color = '#ff6666';
        message.innerHTML = `残念！CPUに負けました...<br>スコア: ${playerScore}`;
    }
    
    gameOverDiv.style.display = 'block';
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted && !gameOver) {
        updatePlayer();
        updateCPU();
        updateProjectiles();
    }
    
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
init();
