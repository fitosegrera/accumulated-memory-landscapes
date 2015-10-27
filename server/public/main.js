if (!Detector.webgl) Detector.addGetWebGLMessage();

var mainCamera, mainScene;
var skyCamera, skyScene, skyMesh;

var renderer;
var controls;
var terrainGeom, terrainMesh;

var clock = new THREE.Clock();
var stats;

var mouseX = 0;
var mouseY = 0;

var cubeGeometry, cubeMaterial, cubeMesh, ms_Water;

var postprocessing = {};
var effectController = {};

initScene();
initTerrain();
initSky("textures/sunnysky/");
//initSky("textures/darkSky/");

//START OF INIT()
function initScene() {

    mainScene = new THREE.Scene();
    mainCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 20000);

    // FOG --> 0xDFF8FD matches the skybox at the horizon
    //mainScene.fog = new THREE.Fog( 0xDFF8FD, 1.0, 1000.0 );
    mainScene.fog = new THREE.FogExp2(0xDFF8FD, 0.001);

    //LIGHTS
    var ambientLight = new THREE.AmbientLight(0x111111);
    var sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.y = sunLight.position.x = 10.0;
    mainScene.add(ambientLight);
    mainScene.add(sunLight);

    //RENDERER
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.autoClearColor = false;
    renderer.setClearColor(0xDFF8FD);
    document.body.appendChild(renderer.domElement);

    //KEYBOARD & MOUSE EVENTS
    document.body.addEventListener('keydown', onKeyDown, false);
    document.body.addEventListener('mousemove', onMouseMove, false);

    //STATS
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    //WATER
    var waterNormals = new THREE.ImageUtils.loadTexture('textures/water/waternormals.jpg');
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

    ms_Water = new THREE.Water(renderer, mainCamera, mainScene, {
        textureWidth: 256,
        textureHeight: 256,
        waterNormals: waterNormals,
        alpha: 1.0,
        sunDirection: sunLight.position.normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        betaVersion: 0,
        side: THREE.DoubleSide,
        fog: true
    });
    var aMeshMirror = new THREE.Mesh(
        new THREE.PlaneGeometry(2048, 2048, 10, 10),
        ms_Water.material
    );
    aMeshMirror.add(ms_Water);
    aMeshMirror.rotation.x = -Math.PI * 0.5;
    aMeshMirror.position.y = 1;
    mainScene.add(aMeshMirror);

    //SOUND OBJECT
    var windAudio = new Audio('audio/wind.ogg');
    windAudio.addEventListener('ended', function() {
        this.currentTime = 0;
        this.play();
    }, false);
    windAudio.play();

    //RANDOM CUBE
    cubeGeometry = new THREE.BoxGeometry(40, 40, 40, 1, 1, 1);
    cubeMaterial = new THREE.MeshBasicMaterial({
        color: getRandomColor(),
        wireframe: true
    });
    cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.set(0, 20, 100);
    mainScene.add(cubeMesh);

    //INITIATE POSTPROCESSING
    initPostprocessing();
    
}

//END OF INIT()

//////////////////////////////////////////
//////////////////////////////////////////

function initPostprocessing() {
    var renderPass = new THREE.RenderPass(mainScene, mainCamera);

    var bokehPass = new THREE.BokehPass(mainScene, mainCamera, {
        focus: 1.0,
        aperture: 0.025,
        maxblur: 1.0,

        width: window.innerWidth,
        height: window.innerHeight
    });

    bokehPass.renderToScreen = true;

    var composer = new THREE.EffectComposer(renderer);

    composer.addPass(renderPass);
    composer.addPass(bokehPass);

    postprocessing.composer = composer;
    postprocessing.bokeh = bokehPass;
}

function initGUI() {

    //CAMERA POS CONTROLLERS
    var halfWidth = terrainGeom.width / 2;
    var halfLength = terrainGeom.length / 2;

    var camPos = controls.getObject().position;

    var gui = new dat.GUI();
    var camFolder = gui.addFolder('mainCamera');
    camFolder.add(camPos, "x", -halfWidth, halfWidth, 0.25).listen();
    camFolder.add(camPos, "z", -halfLength, halfLength, 0.25).listen();
    camFolder.add(controls, "hat", 0, 1000, 1.0).listen();
    camFolder.add(controls, "moveSpeed", 1.0, 100.0, 0.5).listen();

    //BLUR CONTROLLERS
    effectController = {
        focus: 1.0,
        aperture: 0.025,
        maxblur: 1.0,
        active: false
    };

    var matChanger = function() {
        postprocessing.bokeh.uniforms["focus"].value = effectController.focus;
        postprocessing.bokeh.uniforms["aperture"].value = effectController.aperture;
        postprocessing.bokeh.uniforms["maxblur"].value = effectController.maxblur;
        console.log(effectController.active)

    };

    camFolder.add(effectController, "focus", 0.0, 3.0, 0.025).onChange(matChanger);
    camFolder.add(effectController, "aperture", 0.001, 0.2, 0.001).onChange(matChanger);
    camFolder.add(effectController, "maxblur", 0.0, 3.0, 0.025).onChange(matChanger);
    camFolder.add(effectController, 'active').onChange(effectController.active);
    camFolder.close();
}

//

function initSky(sky_path) {

    skyScene = new THREE.Scene();
    skyCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 20000);

    // We'll be setting yaw and pitch from the control which is applied in that order
    skyCamera.rotation.order = "YXZ";

    var path = sky_path;
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    skyCubemap = THREE.ImageUtils.loadTextureCube(urls);

    var shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = skyCubemap;

    // We're inside the box, so make sure to render the backsides
    // It will typically be rendered first in the mainScene and without depth so anything else will be drawn in front
    var skyMaterial = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });

    // The box dimension size doesn't matter that much when the mainCamera is in the center.  Experiment with the values.
    skyboxMesh = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000, 1, 1, 1), skyMaterial);
    //skyScene.add(skyboxMesh);
}

//

function initTerrain() {

    terrainGeom = new THREE.TerrainGeometry();
    terrainGeom.createGeometry("textures/users/imgs/testUser_1/composed.png", startAnimating);

    var splat1 = THREE.ImageUtils.loadTexture("textures/terrain/rock1.png");
    var splat2 = THREE.ImageUtils.loadTexture("textures/terrain/SUNNY-Assorted-Ground.png");
    var splat3 = THREE.ImageUtils.loadTexture("textures/terrain/grass-and-rock.png");
    var splat4 = THREE.ImageUtils.loadTexture("textures/terrain/snow.png");

    var alphaMap = THREE.ImageUtils.loadTexture("textures/terrain/splat2.png");

    terrainUniforms.tAlphaMap.value = alphaMap;
    terrainUniforms.tSplat1.value = splat1;
    terrainUniforms.tSplat2.value = splat2;
    terrainUniforms.tSplat3.value = splat3;
    terrainUniforms.tSplat4.value = splat4;

    var terrainMaterial = new THREE.TerrainMaterial({
        uniforms: terrainUniforms,
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragShader,
        lights: true,
        fog: true
    });

    terrainMesh = new THREE.Mesh(terrainGeom.bufferGeom, terrainMaterial);

    mainScene.add(terrainMesh);
}

//

// Called before we update (animate) for the first time
function startAnimating() {

    controls = new THREE.TerrainControls(mainCamera, terrainGeom, 3.0);
    mainScene.add(controls.getObject());

    initGUI();

    // We're done intitializing so begin the frame loop
    animate();

    window.addEventListener('resize', onWindowResize, false);
}

//

function animate() {

    var delta = clock.getDelta();
    controls.update(delta);
    skyCamera.rotation.set(controls.getPitch(), controls.getYaw(), 0.0);
    requestAnimationFrame(animate);
    render();
    stats.update();

    //var c = getRandomColor();
    //mainScene.children[3].material.color.setHex(toHex(c));

    ms_Water.material.uniforms.time.value += 1.0 / 60.0;
}

//

function render() {
    ms_Water.render();
    renderer.render(skyScene, skyCamera);
    renderer.render(mainScene, mainCamera);
    if(effectController.active){
        postprocessing.composer.render(0.1);
    }
}

//

function onWindowResize() {

    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;

    mainCamera.aspect = skyCamera.aspect = window.innerWidth / window.innerHeight;
    mainCamera.updateProjectionMatrix();
    skyCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function onMouseMove(event) {

    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

//

function onKeyDown(event) {

    if (event.keyCode == 32 || event.shiftKey) {

        var vector = new THREE.Vector3(mouseX, mouseY, mainCamera.near);

        // Convert the [-1, 1] screen coordinate into a world coordinate on the near plane
        var projector = new THREE.Projector();
        projector.unprojectVector(vector, mainCamera);

        var cameraPosition = controls.getObject().position;

        vector.sub(cameraPosition).normalize();

        var raycaster = new THREE.Raycaster(cameraPosition, vector);

        // See if the ray from the camera into the world hits one of our meshes
        var intersects = raycaster.intersectObject(terrainMesh);
    }
}

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function toHex(str) {
    var hex = '';
    for (var i = 0; i < str.length; i++) {
        hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
}