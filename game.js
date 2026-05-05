/**
 * PES 2026 - 3D Football Evolution Engine
 * Powered by Three.js
 */

const GameEngine = (function() {
    // Core Variables
    let scene, camera, renderer, clock;
    let ball, pitch, skybox;
    let homeTeam = [], awayTeam = [];
    let userPlayer = null;
    let gameActive = false;
    let score = { home: 0, away: 0 };
    let matchTime = 0; // seconds
    let matchDuration = 270; // 4.5 minutes

    // Constants
    const PITCH_WIDTH = 70;
    const PITCH_LENGTH = 110;
    const GOAL_WIDTH = 15;
    const BALL_RADIUS = 0.6;
    const PLAYER_HEIGHT = 3.5;

    // Controls
    const keys = { w: false, a: false, s: false, d: false, space: false, k: false, shift: false };

    // Physics
    let ballVelocity = new THREE.Vector3(0, 0, 0);
    const GRAVITY = 0.015;
    const FRICTION = 0.985;
    const BOUNCE = 0.6;

    /**
     * Initialize the game
     */
    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05050a);
        scene.fog = new THREE.Fog(0x05050a, 100, 300);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 80);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(renderer.domElement);

        clock = new THREE.Clock();

        setupLights();
        createPitch();
        createStadium();
        createBall();
        createTeams();
        setupControls();

        window.addEventListener('resize', onWindowResize);
        
        // Start Game
        gameActive = true;
        animate();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        }, 1500);

        // Timer Interval
        setInterval(() => {
            if(gameActive) {
                matchTime++;
                updateUI();
            }
        }, 1000);
    }

    function setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        // Floodlights
        const positions = [
            [80, 50, 80], [-80, 50, 80], [80, 50, -80], [-80, 50, -80]
        ];

        positions.forEach(pos => {
            const light = new THREE.DirectionalLight(0xffffff, 0.6);
            light.position.set(pos[0], pos[1], pos[2]);
            light.castShadow = true;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 500;
            light.shadow.camera.left = -100;
            light.shadow.camera.right = 100;
            light.shadow.camera.top = 100;
            light.shadow.camera.bottom = -100;
            scene.add(light);
        });
    }

    function createPitch() {
        // Main Pitch
        const pitchGeo = new THREE.PlaneGeometry(PITCH_WIDTH + 20, PITCH_LENGTH + 20);
        const pitchMat = new THREE.MeshPhongMaterial({ 
            color: 0x1a472a,
            side: THREE.DoubleSide
        });
        pitch = new THREE.Mesh(pitchGeo, pitchMat);
        pitch.rotation.x = -Math.PI / 2;
        pitch.receiveShadow = true;
        scene.add(pitch);

        // Pitch Markings (White lines)
        const linesGroup = new THREE.Group();
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Outer bounds
        const outerLines = new THREE.BoxGeometry(PITCH_WIDTH, 0.1, PITCH_LENGTH);
        const outerMesh = new THREE.Mesh(outerLines, lineMat);
        outerMesh.position.y = 0.05;
        // This is a bit lazy, let's just make a flat plane with a texture later if needed, 
        // for now let's draw them with thin planes.
        
        function drawLine(w, l, x, z) {
            const g = new THREE.PlaneGeometry(w, l);
            const m = new THREE.Mesh(g, lineMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.1, z);
            scene.add(m);
        }

        // Sidelines
        drawLine(0.5, PITCH_LENGTH, PITCH_WIDTH/2, 0);
        drawLine(0.5, PITCH_LENGTH, -PITCH_WIDTH/2, 0);
        // Goal lines
        drawLine(PITCH_WIDTH, 0.5, 0, PITCH_LENGTH/2);
        drawLine(PITCH_WIDTH, 0.5, 0, -PITCH_LENGTH/2);
        // Center line
        drawLine(PITCH_WIDTH, 0.5, 0, 0);
        // Center circle
        const circleGeo = new THREE.RingGeometry(9.15, 9.65, 64);
        const circle = new THREE.Mesh(circleGeo, lineMat);
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = 0.1;
        scene.add(circle);

        // Penalty areas
        drawBox(40, 16.5, PITCH_LENGTH/2 - 8.25);
        drawBox(40, 16.5, -PITCH_LENGTH/2 + 8.25);

        function drawBox(w, l, z) {
            drawLine(w, 0.5, 0, z + l/2);
            drawLine(w, 0.5, 0, z - l/2);
            drawLine(0.5, l, w/2, z);
            drawLine(0.5, l, -w/2, z);
        }

        // Goals
        createGoal(PITCH_LENGTH/2);
        createGoal(-PITCH_LENGTH/2);
    }

    function createGoal(zPos) {
        const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const postG = new THREE.CylinderGeometry(0.3, 0.3, 7.32, 16);
        const crossG = new THREE.CylinderGeometry(0.3, 0.3, GOAL_WIDTH, 16);

        const leftPost = new THREE.Mesh(postG, mat);
        leftPost.position.set(-GOAL_WIDTH/2, 3.66, zPos);
        scene.add(leftPost);

        const rightPost = new THREE.Mesh(postG, mat);
        rightPost.position.set(GOAL_WIDTH/2, 3.66, zPos);
        scene.add(rightPost);

        const crossbar = new THREE.Mesh(crossG, mat);
        crossbar.position.set(0, 7.32, zPos);
        crossbar.rotation.z = Math.PI / 2;
        scene.add(crossbar);
    }

    function createStadium() {
        // Simple stands
        const standMat = new THREE.MeshPhongMaterial({ color: 0x111122 });
        const standGeo = new THREE.BoxGeometry(150, 20, 20);
        
        const north = new THREE.Mesh(standGeo, standMat);
        north.position.set(0, 5, -PITCH_LENGTH/2 - 20);
        scene.add(north);

        const south = new THREE.Mesh(standGeo, standMat);
        south.position.set(0, 5, PITCH_LENGTH/2 + 20);
        scene.add(south);

        const west = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 200), standMat);
        west.position.set(-PITCH_WIDTH/2 - 25, 5, 0);
        scene.add(west);

        const east = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 200), standMat);
        east.position.set(PITCH_WIDTH/2 + 25, 5, 0);
        scene.add(east);
    }

    function createBall() {
        const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
        const mat = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0x222222
        });
        ball = new THREE.Mesh(geo, mat);
        ball.position.set(0, BALL_RADIUS, 0);
        ball.castShadow = true;
        scene.add(ball);
    }

    function createTeams() {
        // 5 vs 5 for performance and simplicity
        const homePositions = [
            {x: 0, z: 45},   // GK
            {x: -15, z: 25}, // DF
            {x: 15, z: 25},  // DF
            {x: -10, z: 10}, // MF
            {x: 10, z: 10}   // FW (User)
        ];

        const awayPositions = [
            {x: 0, z: -45},
            {x: -15, z: -25},
            {x: 15, z: -25},
            {x: -10, z: -10},
            {x: 10, z: -10}
        ];

        homePositions.forEach((pos, i) => {
            const player = createPlayer(0x0066ff);
            player.position.set(pos.x, PLAYER_HEIGHT/2, pos.z);
            player.team = 'home';
            homeTeam.push(player);
            scene.add(player);
        });

        awayPositions.forEach((pos, i) => {
            const player = createPlayer(0xff3300);
            player.position.set(pos.x, PLAYER_HEIGHT/2, pos.z);
            player.team = 'away';
            awayTeam.push(player);
            scene.add(player);
        });

        userPlayer = homeTeam[4]; // Control the FW
    }

    function createPlayer(color) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const headMat = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.2;
        group.add(head);

        // Eyes (to see direction)
        const eyeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(0.3, 2.3, 0.6);
        group.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(-0.3, 2.3, 0.6);
        group.add(eyeR);

        group.velocity = new THREE.Vector3();
        return group;
    }

    function setupControls() {
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            if(keys.hasOwnProperty(k)) keys[k] = true;
            if(e.key === 'Shift') keys.shift = true;
        });

        window.addEventListener('keyup', e => {
            const k = e.key.toLowerCase();
            if(keys.hasOwnProperty(k)) keys[k] = false;
            if(e.key === 'Shift') keys.shift = false;
        });
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        updateUserMovement();
        updateAI();
        updateBallPhysics();
        updateCamera();

        renderer.render(scene, camera);
    }

    function updateUserMovement() {
        const speed = keys.shift ? 0.6 : 0.35;
        let moveX = 0;
        let moveZ = 0;

        if(keys.w) moveZ -= 1;
        if(keys.s) moveZ += 1;
        if(keys.a) moveX -= 1;
        if(keys.d) moveX += 1;

        if(moveX !== 0 || moveZ !== 0) {
            const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize().multiplyScalar(speed);
            userPlayer.position.add(moveDir);
            
            // Rotation
            const targetRotation = Math.atan2(moveX, moveZ);
            userPlayer.rotation.y = targetRotation;
        }

        // Ball Interaction
        checkBallInteraction(userPlayer, true);
    }

    function updateAI() {
        const aiSpeed = 0.22;
        
        [...homeTeam, ...awayTeam].forEach(p => {
            if(p === userPlayer) return;

            // Simple AI: Chase ball if close
            const distToBall = p.position.distanceTo(ball.position);
            
            if(distToBall < 30) {
                const dir = ball.position.clone().sub(p.position).normalize();
                p.position.x += dir.x * aiSpeed;
                p.position.z += dir.z * aiSpeed;
                p.rotation.y = Math.atan2(dir.x, dir.z);
            }

            checkBallInteraction(p, false);
        });
    }

    function checkBallInteraction(p, isUser) {
        const dist = p.position.distanceTo(ball.position);
        if(dist < 2.5) {
            const dir = ball.position.clone().sub(p.position).normalize();
            dir.y = 0;

            if(isUser) {
                if(keys.space) { // Shoot
                    ballVelocity.copy(dir.multiplyScalar(1.5));
                    ballVelocity.y = 0.4;
                } else if(keys.k) { // Pass
                    ballVelocity.copy(dir.multiplyScalar(0.8));
                    ballVelocity.y = 0.1;
                } else { // Dribble
                    ballVelocity.copy(dir.multiplyScalar(0.45));
                }
            } else {
                // AI Dribble or Shoot
                if(Math.abs(p.position.z) < 20) { // Near goal
                    ballVelocity.copy(dir.multiplyScalar(1.2));
                    ballVelocity.y = 0.3;
                } else {
                    ballVelocity.copy(dir.multiplyScalar(0.3));
                }
            }
        }
    }

    function updateBallPhysics() {
        // Movement
        ball.position.add(ballVelocity);
        
        // Friction & Gravity
        ballVelocity.multiplyScalar(FRICTION);
        if(ball.position.y > BALL_RADIUS) {
            ballVelocity.y -= GRAVITY;
        } else {
            ball.position.y = BALL_RADIUS;
            if(Math.abs(ballVelocity.y) > 0.01) {
                ballVelocity.y *= -BOUNCE;
            } else {
                ballVelocity.y = 0;
            }
        }

        // Pitch Constraints
        if(Math.abs(ball.position.x) > PITCH_WIDTH/2) {
            ballVelocity.x *= -BOUNCE;
            ball.position.x = (PITCH_WIDTH/2) * Math.sign(ball.position.x);
        }

        if(Math.abs(ball.position.z) > PITCH_LENGTH/2) {
            // Goal Detection
            if(Math.abs(ball.position.x) < GOAL_WIDTH/2 && ball.position.y < 7.32) {
                goalScored(ball.position.z > 0 ? 'away' : 'home');
            } else {
                ballVelocity.z *= -BOUNCE;
                ball.position.z = (PITCH_LENGTH/2) * Math.sign(ball.position.z);
            }
        }
    }

    function updateCamera() {
        const targetPos = userPlayer.position.clone();
        const cameraOffset = new THREE.Vector3(0, 45, 60);
        const desiredPos = targetPos.add(cameraOffset);
        
        camera.position.lerp(desiredPos, 0.05);
        camera.lookAt(userPlayer.position.x, 0, userPlayer.position.z - 10);
    }

    function goalScored(team) {
        if(team === 'home') score.home++;
        else score.away++;

        gameActive = false;
        updateUI();

        const announcement = document.getElementById('goal-announcement');
        announcement.classList.remove('hidden');

        setTimeout(() => {
            announcement.classList.add('hidden');
            resetPositions();
            gameActive = true;
            animate();
        }, 3000);
    }

    function resetPositions() {
        ball.position.set(0, BALL_RADIUS, 0);
        ballVelocity.set(0, 0, 0);
        
        // Reset players to initial or center
        // (For simplicity just teleport ball for now, but usually we reset teams)
    }

    function updateUI() {
        document.getElementById('home-score').innerText = score.home;
        document.getElementById('away-score').innerText = score.away;
        
        const m = Math.floor(matchTime / 60);
        const s = matchTime % 60;
        document.getElementById('match-timer').innerText = 
            `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return {
        start: init
    };
})();

// Initialize when window loads
window.onload = GameEngine.start;
