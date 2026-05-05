/**
 * PES 2026 - 3D Football Evolution Engine
 * Robust Version
 */

const GameEngine = (function() {
    let scene, camera, renderer, clock;
    let ball, userPlayer;
    let homeTeam = [], awayTeam = [];
    let gameActive = false;
    let score = { home: 0, away: 0 };
    let matchTime = 0;
    
    const PITCH_WIDTH = 70;
    const PITCH_LENGTH = 110;
    const GOAL_WIDTH = 15;
    const BALL_RADIUS = 0.6;
    const PLAYER_HEIGHT = 3.5;

    const keys = { w: false, a: false, s: false, d: false, space: false, k: false, shift: false };
    let ballVelocity = new THREE.Vector3(0, 0, 0);

    function init() {
        console.log("Game initialization started...");
        try {
            const container = document.getElementById('game-container');
            if (!container) throw new Error("Game container not found");

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x05050a);
            scene.fog = new THREE.Fog(0x05050a, 100, 300);

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 50, 80);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            clock = new THREE.Clock();

            setupLights();
            createPitch();
            createStadium();
            createBall();
            createTeams();
            setupControls();

            gameActive = true;
            animate();

            // Success: Hide loading screen
            hideLoadingScreen();
            
            setInterval(() => {
                if(gameActive) {
                    matchTime++;
                    updateUI();
                }
            }, 1000);

            console.log("Game initialized successfully.");
        } catch (error) {
            console.error("Game Initialization Failed:", error);
            hideLoadingScreen(); // Force hide even on error so user can see something
        }
    }

    function hideLoadingScreen() {
        const ls = document.getElementById('loading-screen');
        if (ls) {
            ls.style.opacity = '0';
            ls.style.pointerEvents = 'none';
            setTimeout(() => { ls.style.display = 'none'; }, 500);
        }
    }

    function setupLights() {
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        scene.add(sun);
    }

    function createPitch() {
        const pitchGeo = new THREE.PlaneGeometry(PITCH_WIDTH + 20, PITCH_LENGTH + 20);
        const pitchMat = new THREE.MeshPhongMaterial({ color: 0x1a472a });
        const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
        pitchMesh.rotation.x = -Math.PI / 2;
        pitchMesh.receiveShadow = true;
        scene.add(pitchMesh);

        // Simple Lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const drawL = (w, l, x, z) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lineMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.05, z);
            scene.add(m);
        };

        drawL(PITCH_WIDTH, 0.5, 0, PITCH_LENGTH/2);
        drawL(PITCH_WIDTH, 0.5, 0, -PITCH_LENGTH/2);
        drawL(0.5, PITCH_LENGTH, PITCH_WIDTH/2, 0);
        drawL(0.5, PITCH_LENGTH, -PITCH_WIDTH/2, 0);
        drawL(PITCH_WIDTH, 0.5, 0, 0); // Center

        createGoal(PITCH_LENGTH/2);
        createGoal(-PITCH_LENGTH/2);
    }

    function createGoal(z) {
        const mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const post = new THREE.CylinderGeometry(0.3, 0.3, 7.32);
        const bar = new THREE.CylinderGeometry(0.3, 0.3, GOAL_WIDTH);
        
        const lp = new THREE.Mesh(post, mat); lp.position.set(-GOAL_WIDTH/2, 3.6, z); scene.add(lp);
        const rp = new THREE.Mesh(post, mat); rp.position.set(GOAL_WIDTH/2, 3.6, z); scene.add(rp);
        const cb = new THREE.Mesh(bar, mat); cb.position.set(0, 7.3, z); cb.rotation.z = Math.PI/2; scene.add(cb);
    }

    function createStadium() {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(160, 20, 20), new THREE.MeshPhongMaterial({ color: 0x111122 }));
        stand.position.set(0, 5, -PITCH_LENGTH/2 - 25);
        scene.add(stand.clone());
        stand.position.z = PITCH_LENGTH/2 + 25;
        scene.add(stand);
    }

    function createBall() {
        ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 16, 16), new THREE.MeshPhongMaterial({ color: 0xffffff }));
        ball.position.set(0, BALL_RADIUS, 0);
        ball.castShadow = true;
        scene.add(ball);
    }

    function createTeams() {
        const posH = [{x:0,z:40},{x:-15,z:20},{x:15,z:20},{x:-10,z:5},{x:10,z:5}];
        const posA = [{x:0,z:-40},{x:-15,z:-20},{x:15,z:-20},{x:-10,z:-5},{x:10,z:-5}];
        
        posH.forEach(p => { 
            const ply = createPlayer(0x0066ff); ply.position.set(p.x, 1.75, p.z); 
            homeTeam.push(ply); scene.add(ply); 
        });
        posA.forEach(p => { 
            const ply = createPlayer(0xff3300); ply.position.set(p.x, 1.75, p.z); 
            awayTeam.push(ply); scene.add(ply); 
        });
        userPlayer = homeTeam[4];
    }

    function createPlayer(color) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.5), new THREE.MeshPhongMaterial({ color }));
        body.castShadow = true; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.7), new THREE.MeshPhongMaterial({ color: 0xffdbac }));
        head.position.y = 1.8; g.add(head);
        return g;
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);
        
        // Movement
        const speed = keys.shift ? 0.6 : 0.35;
        let mx = 0, mz = 0;
        if(keys.w) mz -= 1; if(keys.s) mz += 1; if(keys.a) mx -= 1; if(keys.d) mx += 1;
        if(mx !== 0 || mz !== 0) {
            const dir = new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(speed);
            userPlayer.position.add(dir);
            userPlayer.rotation.y = Math.atan2(mx, mz);
        }

        // Ball Interaction
        if(userPlayer.position.distanceTo(ball.position) < 3) {
            const dir = ball.position.clone().sub(userPlayer.position).normalize();
            if(keys.space) { ballVelocity.copy(dir.multiplyScalar(1.5)); ballVelocity.y = 0.4; }
            else { ballVelocity.copy(dir.multiplyScalar(0.4)); }
        }

        // AI
        awayTeam.forEach(p => {
            if(p.position.distanceTo(ball.position) < 25) {
                const dir = ball.position.clone().sub(p.position).normalize();
                p.position.x += dir.x * 0.2; p.position.z += dir.z * 0.2;
                if(p.position.distanceTo(ball.position) < 2.5) ballVelocity.copy(dir.multiplyScalar(0.3));
            }
        });

        // Physics
        ball.position.add(ballVelocity);
        ballVelocity.multiplyScalar(0.98);
        if(ball.position.y > BALL_RADIUS) ballVelocity.y -= 0.015;
        else { ball.position.y = BALL_RADIUS; ballVelocity.y *= -0.5; }

        if(Math.abs(ball.position.z) > PITCH_LENGTH/2) {
            if(Math.abs(ball.position.x) < GOAL_WIDTH/2) goalScored(ball.position.z > 0 ? 'away' : 'home');
            else ballVelocity.z *= -0.5;
        }

        // Camera
        camera.position.lerp(new THREE.Vector3(userPlayer.position.x, 45, userPlayer.position.z + 60), 0.05);
        camera.lookAt(userPlayer.position.x, 0, userPlayer.position.z);

        renderer.render(scene, camera);
    }

    function goalScored(team) {
        if(team === 'home') score.home++; else score.away++;
        gameActive = false; updateUI();
        document.getElementById('goal-announcement').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('goal-announcement').classList.add('hidden');
            ball.position.set(0, BALL_RADIUS, 0); ballVelocity.set(0,0,0);
            gameActive = true; animate();
        }, 2000);
    }

    function updateUI() {
        document.getElementById('home-score').innerText = score.home;
        document.getElementById('away-score').innerText = score.away;
        const m = Math.floor(matchTime/60), s = matchTime%60;
        document.getElementById('match-timer').innerText = `${m}:${s.toString().padStart(2,'0')}`;
    }

    function setupControls() {
        window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = true; if(e.key === 'Shift') keys.shift = true; });
        window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if(keys.hasOwnProperty(k)) keys[k] = false; if(e.key === 'Shift') keys.shift = false; });
        window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
    }

    return { start: init };
})();

document.addEventListener('DOMContentLoaded', GameEngine.start);
