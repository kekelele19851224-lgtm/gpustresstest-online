// GPU Stress Test Online - Main JavaScript File
// gpustresstest.online

// Global variables
let scene, camera, renderer;
let isTestRunning = false;
let isMobile = false;
let testObjects = [];
let animationId = null;
let testStartTime = 0;
let testDuration = 30; // 30 seconds
let frameCount = 0;
let lastFPSUpdate = 0;
let canvas = null;

// Monitoring variables
let fpsChart = null;
let fpsData = [];
let avgFPS = 0;
let totalFrames = 0;
let simulatedTemp = 65;

// Test level variables
let currentLevel = 'medium';
let testLevels = {
    light: { 
        objects: 50, 
        name: 'Light Test',
        multiplier: 0.7,
        expectedFPS: { desktop: 45, mobile: 30 }
    },
    medium: { 
        objects: 150, 
        name: 'Medium Test',
        multiplier: 1.0,
        expectedFPS: { desktop: 35, mobile: 22 }
    },
    heavy: { 
        objects: 300, 
        name: 'Heavy Test',
        multiplier: 1.3,
        expectedFPS: { desktop: 25, mobile: 15 }
    },
    extreme: { 
        objects: 500, 
        name: 'Extreme Test',
        multiplier: 1.6,
        expectedFPS: { desktop: 18, mobile: 10 }
    }
};

// Results tracking
let testResults = {
    minFPS: Infinity,
    maxFPS: 0,
    avgFPS: 0,
    maxTemp: 65,
    stability: 100,
    score: 0
};

// Device detection
function detectDevice() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Device detected:', isMobile ? 'Mobile' : 'Desktop');
}

// WebGL and GPU detection
function getGPUInfo() {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        return { renderer: 'WebGL not supported', vendor: 'Unknown' };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
    
    return { renderer, vendor };
}

// Initialize Three.js scene
function initThreeJS() {
    try {
        // Check if Three.js is available
        if (!isThreeJSLoaded()) {
            throw new Error('Three.js library is not loaded');
        }
        
        // Get and verify canvas element
        canvas = document.getElementById('test-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found in DOM');
        }
        
        // Ensure canvas is properly mounted to DOM
        if (!document.body.contains(canvas)) {
            throw new Error('Canvas element is not mounted to DOM');
        }
        
        // Pre-test WebGL context creation
        const testGL = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!testGL) {
            throw new Error('Failed to create WebGL context on canvas element');
        }
        
        console.log('Canvas and WebGL context verified');
        
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // Create camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 10;
        
        // Create renderer with enhanced error handling
        try {
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: true,
                powerPreference: "high-performance",
                alpha: false,
                premultipliedAlpha: false,
                stencil: false,
                preserveDrawingBuffer: false
            });
        } catch (rendererError) {
            console.error('WebGLRenderer creation failed:', rendererError);
            // Try with minimal settings
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                antialias: false,
                powerPreference: "default"
            });
            console.log('Fallback renderer created with minimal settings');
        }
        
        // Configure renderer
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
        
        // Check renderer capabilities
        const gl = renderer.getContext();
        const capabilities = renderer.capabilities;
        
        console.log('WebGL Capabilities:', {
            version: capabilities.isWebGL2 ? '2.0' : '1.0',
            maxTextures: capabilities.maxTextures,
            maxVertexTextures: capabilities.maxVertexTextures,
            maxTextureSize: capabilities.maxTextureSize,
            maxCubemapSize: capabilities.maxCubemapSize,
            floatTextures: capabilities.floatFragmentTextures,
            vertexShaderPrecision: gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision,
            fragmentShaderPrecision: gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision
        });
        
        // Get GPU info with enhanced error handling
        let gpuInfo;
        try {
            gpuInfo = getGPUInfo();
            console.log('GPU Info:', gpuInfo);
        } catch (gpuError) {
            console.warn('Failed to get GPU info:', gpuError);
            gpuInfo = { renderer: 'Unknown GPU', vendor: 'Unknown' };
        }
        
        // Update system info display
        updateSystemInfo(gpuInfo);
        
        console.log('Three.js initialized successfully');
        return true;
        
    } catch (error) {
        console.error('Three.js initialization failed:', error);
        
        // Show user-friendly error message
        let errorMessage = 'Failed to initialize 3D graphics. ';
        
        if (error.message.includes('Three.js library')) {
            errorMessage += 'Graphics library failed to load. Please check your internet connection and refresh the page.';
        } else if (error.message.includes('Canvas element')) {
            errorMessage += 'Graphics canvas not found. Please refresh the page.';
        } else if (error.message.includes('WebGL context')) {
            errorMessage += 'Your browser or graphics card does not support WebGL. Please update your browser or enable hardware acceleration.';
        } else {
            errorMessage += 'Please ensure your browser supports WebGL and try refreshing the page.';
        }
        
        showError(errorMessage);
        return false;
    }
}

// Create stress test objects based on selected level
function createStressTestObjects() {
    testObjects = [];
    const levelConfig = testLevels[currentLevel];
    const baseObjectCount = levelConfig.objects;
    const objectCount = isMobile ? Math.floor(baseObjectCount * 0.5) : baseObjectCount;
    
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const materials = [
        new THREE.MeshPhongMaterial({ color: 0x00ff88 }),
        new THREE.MeshPhongMaterial({ color: 0xff4444 }),
        new THREE.MeshPhongMaterial({ color: 0x4444ff }),
        new THREE.MeshPhongMaterial({ color: 0xffff44 }),
        new THREE.MeshPhongMaterial({ color: 0xff44ff })
    ];
    
    for (let i = 0; i < objectCount; i++) {
        const material = materials[i % materials.length];
        const cube = new THREE.Mesh(geometry, material);
        
        // Random position
        cube.position.x = (Math.random() - 0.5) * 20;
        cube.position.y = (Math.random() - 0.5) * 20;
        cube.position.z = (Math.random() - 0.5) * 20;
        
        // Random rotation speed
        cube.userData = {
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            }
        };
        
        scene.add(cube);
        testObjects.push(cube);
    }
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    document.getElementById('object-count').textContent = objectCount;
    document.getElementById('objects-display').textContent = objectCount;
    console.log(`Created ${objectCount} test objects`);
}

// Initialize FPS Chart
function initFPSChart() {
    if (!isMobile) { // Only show chart on desktop
        const ctx = document.getElementById('fps-chart').getContext('2d');
        fpsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'FPS',
                    data: [],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#b0b0b0',
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            }
        });
    }
}

// Update system information display
function updateSystemInfo(gpuInfo) {
    document.getElementById('gpu-info').textContent = gpuInfo.renderer || 'Unknown GPU';
    document.getElementById('device-type').textContent = isMobile ? 'Mobile' : 'Desktop';
    
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const webglVersion = gl instanceof WebGL2RenderingContext ? '2.0' : '1.0';
    document.getElementById('webgl-version').textContent = webglVersion;
}

// Animation loop
function animate() {
    if (!isTestRunning) return;
    
    animationId = requestAnimationFrame(animate);
    
    // Update timer and progress
    const elapsed = Date.now() - testStartTime;
    const remaining = Math.max(0, testDuration - Math.floor(elapsed / 1000));
    const progress = ((testDuration - remaining) / testDuration) * 100;
    
    document.getElementById('progress-time').textContent = remaining + 's';
    document.getElementById('progress-fill').style.width = progress + '%';
    
    // Stop test when time is up
    if (remaining === 0) {
        stopGPUTest();
        return;
    }
    
    // Animate objects
    testObjects.forEach(obj => {
        obj.rotation.x += obj.userData.rotationSpeed.x;
        obj.rotation.y += obj.userData.rotationSpeed.y;
        obj.rotation.z += obj.userData.rotationSpeed.z;
    });
    
    // Rotate camera
    camera.position.x = Math.cos(Date.now() * 0.0005) * 10;
    camera.position.z = Math.sin(Date.now() * 0.0005) * 10;
    camera.lookAt(0, 0, 0);
    
    // Update FPS and monitoring
    frameCount++;
    totalFrames++;
    const now = Date.now();
    if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round(frameCount / ((now - lastFPSUpdate) / 1000));
        
        // Update FPS displays
        document.getElementById('fps-display').textContent = fps;
        
        // Calculate average FPS
        const elapsedSeconds = (now - testStartTime) / 1000;
        avgFPS = Math.round(totalFrames / elapsedSeconds);
        document.getElementById('avg-fps-display').textContent = avgFPS;
        
        // Track min/max FPS for results
        testResults.minFPS = Math.min(testResults.minFPS, fps);
        testResults.maxFPS = Math.max(testResults.maxFPS, fps);
        testResults.avgFPS = avgFPS;
        
        // Update FPS chart
        if (fpsChart && !isMobile) {
            const timeLabel = Math.floor(elapsedSeconds) + 's';
            fpsChart.data.labels.push(timeLabel);
            fpsChart.data.datasets[0].data.push(fps);
            
            // Keep only last 30 data points
            if (fpsChart.data.labels.length > 30) {
                fpsChart.data.labels.shift();
                fpsChart.data.datasets[0].data.shift();
            }
            
            fpsChart.update('none');
        }
        
        // Simulate temperature increase during stress test
        const levelMultiplier = testLevels[currentLevel].multiplier;
        simulatedTemp = Math.min(90, 65 + (elapsedSeconds * 0.5 * levelMultiplier) + (Math.random() * 3 - 1.5));
        document.getElementById('temp-display').textContent = Math.round(simulatedTemp) + '°C';
        testResults.maxTemp = Math.max(testResults.maxTemp, simulatedTemp);
        
        frameCount = 0;
        lastFPSUpdate = now;
    }
    
    renderer.render(scene, camera);
}

// Calculate score based on performance
function calculateScore() {
    const levelConfig = testLevels[currentLevel];
    const expectedFPS = isMobile ? levelConfig.expectedFPS.mobile : levelConfig.expectedFPS.desktop;
    
    // Base score from average FPS performance
    const fpsScore = Math.min(100, (testResults.avgFPS / expectedFPS) * 60);
    
    // Penalty for high temperature
    const tempPenalty = Math.max(0, (testResults.maxTemp - 75) * 2);
    
    // Stability bonus (based on FPS consistency)
    const fpsRange = testResults.maxFPS - testResults.minFPS;
    const stabilityBonus = Math.max(0, 30 - fpsRange);
    
    // Final score calculation
    const rawScore = fpsScore - tempPenalty + stabilityBonus;
    testResults.score = Math.max(0, Math.min(100, Math.round(rawScore)));
    testResults.stability = Math.max(0, Math.min(100, Math.round(100 - (fpsRange / testResults.avgFPS) * 100)));
    
    return testResults.score;
}

// Save test results to localStorage
function saveTestResults() {
    const result = {
        level: currentLevel,
        levelName: testLevels[currentLevel].name,
        score: testResults.score,
        avgFPS: testResults.avgFPS,
        minFPS: testResults.minFPS,
        maxFPS: testResults.maxFPS,
        maxTemp: Math.round(testResults.maxTemp),
        stability: testResults.stability,
        objects: testLevels[currentLevel].objects,
        deviceType: isMobile ? 'Mobile' : 'Desktop',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    
    let savedResults = JSON.parse(localStorage.getItem('gpuTestResults') || '[]');
    savedResults.unshift(result); // Add to beginning
    savedResults = savedResults.slice(0, 10); // Keep only last 10 results
    
    localStorage.setItem('gpuTestResults', JSON.stringify(savedResults));
    console.log('Test results saved:', result);
}

// Start GPU Test function (with level)
function startGPUTest(level = 'medium') {
    if (isTestRunning) return;
    
    currentLevel = level;
    console.log(`GPU Test initiated - Level: ${testLevels[level].name}`);
    
    isTestRunning = true;
    testStartTime = Date.now();
    frameCount = 0;
    totalFrames = 0;
    lastFPSUpdate = Date.now();
    simulatedTemp = 65;
    
    // Reset monitoring data and results tracking
    fpsData = [];
    avgFPS = 0;
    testResults = {
        minFPS: Infinity,
        maxFPS: 0,
        avgFPS: 0,
        maxTemp: 65,
        stability: 100,
        score: 0
    };
    
    // Show canvas and monitoring interface
    document.getElementById('test-canvas').style.display = 'block';
    document.querySelector('.test-monitoring').style.display = 'block';
    document.querySelector('.level-selection').style.display = 'none';
    
    // Initialize FPS chart
    initFPSChart();
    
    // Create test objects and start animation
    createStressTestObjects();
    animate();
}

// Stop GPU Test function
function stopGPUTest() {
    if (!isTestRunning) return;
    
    console.log('GPU Test stopped');
    isTestRunning = false;
    
    // Stop animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Calculate final score
    const finalScore = calculateScore();
    
    // Save results
    saveTestResults();
    
    // Clear objects
    testObjects.forEach(obj => {
        scene.remove(obj);
    });
    testObjects = [];
    
    // Clear lights
    scene.children.forEach(child => {
        if (child.type === 'AmbientLight' || child.type === 'DirectionalLight') {
            scene.remove(child);
        }
    });
    
    // Clean up chart
    if (fpsChart) {
        fpsChart.destroy();
        fpsChart = null;
    }
    
    // Hide canvas and monitoring interface
    document.getElementById('test-canvas').style.display = 'none';
    document.querySelector('.test-monitoring').style.display = 'none';
    
    // Show results
    showTestResults();
    
    console.log('Test completed - Score:', finalScore, 'Average FPS:', avgFPS);
}

// Show test results page
function showTestResults() {
    // Update results display
    document.getElementById('completed-level').textContent = testLevels[currentLevel].name;
    document.getElementById('completion-time').textContent = new Date().toLocaleTimeString();
    document.getElementById('final-score').textContent = testResults.score;
    document.getElementById('result-avg-fps').textContent = testResults.avgFPS;
    document.getElementById('result-min-fps').textContent = testResults.minFPS === Infinity ? 0 : testResults.minFPS;
    document.getElementById('result-max-fps').textContent = testResults.maxFPS;
    document.getElementById('result-objects').textContent = testLevels[currentLevel].objects;
    document.getElementById('result-gpu-temp').textContent = Math.round(testResults.maxTemp) + '°C';
    document.getElementById('result-stability').textContent = testResults.stability + '%';
    
    // Update score rating
    const scoreRating = document.getElementById('score-rating');
    if (testResults.score >= 90) {
        scoreRating.textContent = 'Outstanding';
        scoreRating.style.color = '#00ff88';
    } else if (testResults.score >= 75) {
        scoreRating.textContent = 'Excellent';
        scoreRating.style.color = '#00ff88';
    } else if (testResults.score >= 60) {
        scoreRating.textContent = 'Good';
        scoreRating.style.color = '#ffff44';
    } else if (testResults.score >= 40) {
        scoreRating.textContent = 'Fair';
        scoreRating.style.color = '#ff8844';
    } else {
        scoreRating.textContent = 'Poor';
        scoreRating.style.color = '#ff4444';
    }
    
    // Load and display previous test results
    loadPreviousResults();
    
    // Show results page
    document.querySelector('.test-results').style.display = 'block';
    
    // Show social sharing buttons
    showSocialSharing();
}

// Load and display previous test results
function loadPreviousResults() {
    const savedResults = JSON.parse(localStorage.getItem('gpuTestResults') || '[]');
    const comparisonList = document.getElementById('previous-tests');
    
    if (savedResults.length <= 1) { // Only current test or no tests
        comparisonList.innerHTML = '<div class="comparison-item">No previous tests found</div>';
        return;
    }
    
    // Skip first result (current test) and show up to 5 previous
    const previousTests = savedResults.slice(1, 6);
    
    comparisonList.innerHTML = previousTests.map(result => `
        <div class="comparison-item">
            <span>${result.levelName} (${result.date})</span>
            <span>Score: ${result.score} | FPS: ${result.avgFPS}</span>
        </div>
    `).join('');
}

// Handle window resize
function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Show level selection page
function showLevelSelection() {
    console.log('📋 showLevelSelection() function called');
    
    const heroElement = document.querySelector('.hero');
    const levelSelectionElement = document.querySelector('.level-selection');
    const testResultsElement = document.querySelector('.test-results');
    
    console.log('🔍 Elements found:', {
        hero: !!heroElement,
        levelSelection: !!levelSelectionElement,
        testResults: !!testResultsElement
    });
    
    if (heroElement) {
        heroElement.style.display = 'none';
        console.log('✅ Hero section hidden');
    } else {
        console.error('❌ Hero element not found');
    }
    
    if (levelSelectionElement) {
        levelSelectionElement.style.display = 'block';
        console.log('✅ Level selection shown');
    } else {
        console.error('❌ Level selection element not found');
    }
    
    if (testResultsElement) {
        testResultsElement.style.display = 'none';
        console.log('✅ Test results hidden');
    } else {
        console.error('❌ Test results element not found');
    }
    
    // Prevent any scrolling to anchors
    window.scrollTo(0, 0);
    console.log('✅ Scrolled to top to prevent anchor navigation');
}

// Show home page
function showHomePage() {
    document.querySelector('.hero').style.display = 'block';
    document.querySelector('.level-selection').style.display = 'none';
    document.querySelector('.test-results').style.display = 'none';
}

// Global app state
let appMode = 'loading'; // 'loading', '3d', '2d', 'error'
let fallbackAnimationId = null;

// Initialize event listeners (always bind, regardless of 3D support)
function initEventListeners() {
    console.log('🔧 Initializing event listeners...');
    
    // Debug: Re-check button availability during initialization
    console.log('🔍 Button availability check during event binding:');
    const allButtonsNow = document.querySelectorAll('button');
    console.log('- Total buttons available:', allButtonsNow.length);
    
    // Add event listeners for main start button
    const startButton = document.querySelector('.start-test-btn');
    console.log('🎯 Start button search result:', startButton);
    
    if (startButton) {
        console.log('✅ Adding click listener to start button');
        startButton.addEventListener('click', function(e) {
            console.log('🖱️ START BUTTON RAW CLICK EVENT FIRED!', {
                mode: appMode,
                timestamp: new Date().toISOString(),
                eventType: e.type,
                target: e.target.tagName,
                targetClass: e.target.className,
                defaultPrevented: e.defaultPrevented
            });
            
            // Prevent any default browser behavior
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            console.log('✅ Event prevented and stopped');
            
            // Call our handler
            handleStartButtonClick();
        });
        console.log('✅ Main start button event listener added successfully');
        
        // Test if button is clickable
        console.log('🔍 Start button clickability test:', {
            disabled: startButton.disabled,
            style_display: window.getComputedStyle(startButton).display,
            style_visibility: window.getComputedStyle(startButton).visibility,
            pointer_events: window.getComputedStyle(startButton).pointerEvents
        });
    } else {
        console.error('❌ Start button not found during event listener setup!');
        console.log('🔍 Available buttons during setup:');
        allButtonsNow.forEach((btn, i) => {
            console.log(`  ${i + 1}. "${btn.textContent?.trim()}" (class: ${btn.className})`);
        });
    }
    
    // Add event listeners for level selection buttons (delegate to handle dynamic content)
    document.addEventListener('click', function(e) {
        if (e.target.matches('.level-btn')) {
            const levelCard = e.target.closest('.level-card');
            const level = levelCard ? levelCard.dataset.level : 'medium';
            console.log('Level button clicked:', level, 'mode:', appMode);
            handleLevelButtonClick(level);
        }
        
        if (e.target.matches('.back-btn')) {
            console.log('Back button clicked');
            showHomePage();
        }
        
        if (e.target.matches('.stop-test-btn')) {
            console.log('Stop button clicked');
            handleStopTest();
        }
        
        if (e.target.matches('.test-again-btn')) {
            console.log('Test again button clicked');
            handleLevelButtonClick(currentLevel);
        }
        
        if (e.target.matches('.new-level-btn')) {
            console.log('New level button clicked');
            showLevelSelection();
        }
        
        if (e.target.matches('.home-btn')) {
            console.log('Home button clicked');
            showHomePage();
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    console.log('All event listeners initialized with delegation');
}

// Handle start button click
function handleStartButtonClick() {
    console.log('🚀 START BUTTON CLICK HANDLER CALLED!');
    console.log('🔍 Detailed click information:', {
        appMode: appMode,
        timestamp: new Date().toISOString(),
        isTestRunning: isTestRunning,
        threeJSLoaded: window.threeJSConfig?.loaded,
        threeJSError: window.threeJSConfig?.error
    });
    
    // Debug: Check current page state before navigation
    console.log('🔍 Current page state before navigation:', {
        heroDisplay: document.querySelector('.hero')?.style.display,
        levelSelectionDisplay: document.querySelector('.level-selection')?.style.display,
        testResultsDisplay: document.querySelector('.test-results')?.style.display
    });
    
    if (appMode === '3d') {
        console.log('✅ App mode is 3D - calling showLevelSelection()');
        showLevelSelection();
        console.log('✅ showLevelSelection() called successfully');
    } else if (appMode === '2d') {
        console.log('✅ App mode is 2D - calling showFallbackLevelSelection()');
        showFallbackLevelSelection();
        console.log('✅ showFallbackLevelSelection() called successfully');
    } else if (appMode === 'loading') {
        console.log('⏳ App still loading, showing loading message');
        showLoadingMessage();
    } else {
        console.error('❌ Unknown app mode:', appMode);
        showError('Application not ready. Please refresh the page.');
    }
    
    // Debug: Check page state after navigation
    console.log('🔍 Page state after navigation:', {
        heroDisplay: document.querySelector('.hero')?.style.display,
        levelSelectionDisplay: document.querySelector('.level-selection')?.style.display,
        testResultsDisplay: document.querySelector('.test-results')?.style.display,
        currentScrollPosition: window.scrollY
    });
}

// Handle level button click
function handleLevelButtonClick(level) {
    console.log('🎯 Handling level button click!', {
        level: level,
        appMode: appMode,
        timestamp: new Date().toISOString(),
        isTestRunning: isTestRunning
    });
    
    if (appMode === '3d') {
        console.log('✅ Starting 3D GPU test');
        startGPUTest(level);
    } else if (appMode === '2d') {
        console.log('✅ Starting 2D fallback test');
        startFallbackTest(level);
    } else {
        console.error('❌ Invalid app mode for level test:', appMode);
        showError('Test mode not available. Please refresh the page.');
    }
}

// Handle stop test
function handleStopTest() {
    if (appMode === '3d') {
        stopGPUTest();
    } else if (appMode === '2d') {
        stopFallbackTest();
    }
}

// Initialize application with 3D support
function init3DMode() {
    console.log('Initializing 3D mode...');
    detectDevice();
    
    if (initThreeJS()) {
        console.log('🎉 GPU Stress Test application initialized successfully in 3D mode');
        appMode = '3d';
        console.log('🔄 App mode set to:', appMode);
        updateUIFor3DMode();
        console.log('✅ UI updated for 3D mode, initializing event listeners...');
        initEventListeners();
        return true;
    } else {
        console.error('Failed to initialize Three.js - falling back to 2D mode');
        return false;
    }
}

// Initialize fallback 2D mode
function init2DMode() {
    console.log('🎨 Initializing 2D fallback mode...');
    detectDevice();
    appMode = '2d';
    console.log('🔄 App mode set to:', appMode);
    updateUIFor2DMode();
    console.log('✅ UI updated for 2D mode, initializing event listeners...');
    initEventListeners();
    console.log('🎉 2D fallback mode initialized successfully');
}

// Update UI for 3D mode
function updateUIFor3DMode() {
    const heroDescription = document.querySelector('.hero-description');
    if (heroDescription) {
        heroDescription.innerHTML = `
            Put your GPU to the ultimate test with our comprehensive WebGL-powered stress testing suite. 
            Monitor real-time 3D rendering performance, temperature, and ensure your graphics card can handle 
            the most demanding workloads.
        `;
    }
    
    const startBtn = document.querySelector('.start-test-btn');
    if (startBtn) {
        startBtn.innerHTML = '🎮 Start 3D GPU Test';
        startBtn.title = '3D WebGL-powered GPU stress test';
    }
}

// Update UI for 2D mode  
function updateUIFor2DMode() {
    const heroDescription = document.querySelector('.hero-description');
    if (heroDescription) {
        heroDescription.innerHTML = `
            <strong>3D Mode Unavailable:</strong> Testing your system with our 2D performance benchmark suite. 
            While not as intensive as 3D testing, this will still provide useful performance insights.
            <br><br>
            <small style="color: #ffaa44;">⚠️ For full GPU testing, please ensure WebGL is supported and try refreshing the page.</small>
        `;
    }
    
    const startBtn = document.querySelector('.start-test-btn');
    if (startBtn) {
        startBtn.innerHTML = '📊 Start 2D Performance Test';
        startBtn.title = '2D CSS-based performance test (fallback mode)';
    }
}

// Show loading message
function showLoadingMessage() {
    showError('Application is still loading. Please wait a moment and try again.');
}

// 2D Fallback Mode Functions
function showFallbackLevelSelection() {
    console.log('Showing 2D fallback level selection');
    document.querySelector('.hero').style.display = 'none';
    document.querySelector('.level-selection').style.display = 'block';
    document.querySelector('.test-results').style.display = 'none';
    
    // Update level selection descriptions for 2D mode
    const levelCards = document.querySelectorAll('.level-card');
    levelCards.forEach(card => {
        const level = card.dataset.level;
        const description = card.querySelector('p');
        if (description) {
            switch(level) {
                case 'light':
                    description.textContent = '2D CSS animations and basic DOM stress testing';
                    break;
                case 'medium':
                    description.textContent = 'Complex CSS transforms and animation performance testing';
                    break;
                case 'heavy':
                    description.textContent = 'Intensive DOM manipulation and layout stress testing';
                    break;
                case 'extreme':
                    description.textContent = 'Maximum CSS animation and computational stress testing';
                    break;
            }
        }
    });
}

// Start 2D fallback test
function startFallbackTest(level) {
    console.log('Starting 2D fallback test:', level);
    currentLevel = level;
    isTestRunning = true;
    testStartTime = Date.now();
    frameCount = 0;
    totalFrames = 0;
    lastFPSUpdate = Date.now();
    
    // Reset results tracking
    testResults = {
        minFPS: Infinity,
        maxFPS: 0,
        avgFPS: 0,
        maxTemp: 65,
        stability: 100,
        score: 0
    };
    
    // Hide level selection and show 2D test interface
    document.querySelector('.level-selection').style.display = 'none';
    show2DTestInterface();
    
    // Start 2D animation test
    start2DAnimation(level);
}

// Show 2D test interface
function show2DTestInterface() {
    let testContainer = document.getElementById('fallback-test-container');
    
    if (!testContainer) {
        testContainer = document.createElement('div');
        testContainer.id = 'fallback-test-container';
        testContainer.className = 'fallback-test-container';
        document.body.appendChild(testContainer);
    }
    
    testContainer.innerHTML = `
        <div class="fallback-test-overlay">
            <div class="fallback-header">
                <h2>2D Performance Test</h2>
                <div class="test-mode-info">
                    <span class="mode-badge">2D Mode</span>
                    <span class="level-name">${testLevels[currentLevel].name}</span>
                </div>
            </div>
            
            <div class="fallback-stats">
                <div class="fallback-stat">
                    <div class="stat-value" id="fallback-fps">0</div>
                    <div class="stat-label">Animation FPS</div>
                </div>
                <div class="fallback-stat">
                    <div class="stat-value" id="fallback-time">30s</div>
                    <div class="stat-label">Time Remaining</div>
                </div>
                <div class="fallback-stat">
                    <div class="stat-value" id="fallback-elements">0</div>
                    <div class="stat-label">Animated Elements</div>
                </div>
            </div>
            
            <div class="fallback-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="fallback-progress"></div>
                </div>
            </div>
            
            <div class="fallback-animation-area" id="animation-area">
                <!-- Animated elements will be added here -->
            </div>
            
            <div class="fallback-controls">
                <button class="stop-test-btn fallback-stop-btn">Stop Test</button>
            </div>
        </div>
    `;
    
    testContainer.style.display = 'block';
}

// Start 2D animation stress test
function start2DAnimation(level) {
    const levelConfig = testLevels[level];
    const elementCount = isMobile ? Math.floor(levelConfig.objects * 0.3) : Math.floor(levelConfig.objects * 0.5);
    const animationArea = document.getElementById('animation-area');
    
    console.log(`Starting 2D animation test with ${elementCount} elements`);
    document.getElementById('fallback-elements').textContent = elementCount;
    
    // Create animated elements
    for (let i = 0; i < elementCount; i++) {
        const element = document.createElement('div');
        element.className = 'animated-element';
        element.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background: linear-gradient(45deg, #00ff88, #00cc6a);
            border-radius: 50%;
            left: ${Math.random() * 80}%;
            top: ${Math.random() * 80}%;
            animation: fallbackSpin ${0.5 + Math.random() * 2}s linear infinite,
                       fallbackMove ${2 + Math.random() * 4}s ease-in-out infinite alternate;
        `;
        animationArea.appendChild(element);
    }
    
    // Start performance monitoring
    fallbackAnimationId = requestAnimationFrame(updateFallbackTest);
}

// Update 2D test performance
function updateFallbackTest() {
    if (!isTestRunning) return;
    
    const now = Date.now();
    const elapsed = now - testStartTime;
    const remaining = Math.max(0, testDuration - Math.floor(elapsed / 1000));
    const progress = ((testDuration - remaining) / testDuration) * 100;
    
    // Update UI
    document.getElementById('fallback-time').textContent = remaining + 's';
    document.getElementById('fallback-progress').style.width = progress + '%';
    
    // Calculate "FPS" based on requestAnimationFrame callback frequency
    frameCount++;
    totalFrames++;
    
    if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round(frameCount / ((now - lastFPSUpdate) / 1000));
        document.getElementById('fallback-fps').textContent = fps;
        
        // Track performance metrics
        testResults.minFPS = Math.min(testResults.minFPS, fps);
        testResults.maxFPS = Math.max(testResults.maxFPS, fps);
        testResults.avgFPS = Math.round(totalFrames / (elapsed / 1000));
        
        frameCount = 0;
        lastFPSUpdate = now;
    }
    
    // Continue or stop test
    if (remaining > 0) {
        fallbackAnimationId = requestAnimationFrame(updateFallbackTest);
    } else {
        stopFallbackTest();
    }
}

// Stop 2D fallback test
function stopFallbackTest() {
    console.log('Stopping 2D fallback test');
    isTestRunning = false;
    
    if (fallbackAnimationId) {
        cancelAnimationFrame(fallbackAnimationId);
        fallbackAnimationId = null;
    }
    
    // Calculate final score (adjusted for 2D mode)
    const levelConfig = testLevels[currentLevel];
    const expectedFPS = 50; // Lower expectation for 2D mode
    const fpsScore = Math.min(100, (testResults.avgFPS / expectedFPS) * 70); // Max 70% for 2D
    const stabilityBonus = Math.max(0, 20 - (testResults.maxFPS - testResults.minFPS));
    testResults.score = Math.max(0, Math.min(100, Math.round(fpsScore + stabilityBonus)));
    testResults.stability = Math.max(0, Math.min(100, Math.round(100 - ((testResults.maxFPS - testResults.minFPS) / testResults.avgFPS) * 100)));
    
    // Save results
    saveTestResults();
    
    // Hide 2D test interface
    const testContainer = document.getElementById('fallback-test-container');
    if (testContainer) {
        testContainer.style.display = 'none';
    }
    
    // Show results
    show2DTestResults();
}

// Show 2D test results
function show2DTestResults() {
    // Update results display
    document.getElementById('completed-level').textContent = testLevels[currentLevel].name + ' (2D Mode)';
    document.getElementById('completion-time').textContent = new Date().toLocaleTimeString();
    document.getElementById('final-score').textContent = testResults.score;
    document.getElementById('result-avg-fps').textContent = testResults.avgFPS;
    document.getElementById('result-min-fps').textContent = testResults.minFPS === Infinity ? 0 : testResults.minFPS;
    document.getElementById('result-max-fps').textContent = testResults.maxFPS;
    document.getElementById('result-objects').textContent = testLevels[currentLevel].objects;
    document.getElementById('result-gpu-temp').textContent = '65°C'; // Static for 2D mode
    document.getElementById('result-stability').textContent = testResults.stability + '%';
    
    // Update score rating with 2D mode note
    const scoreRating = document.getElementById('score-rating');
    let rating = 'Poor';
    let color = '#ff4444';
    
    if (testResults.score >= 70) {
        rating = 'Excellent (2D)';
        color = '#00ff88';
    } else if (testResults.score >= 50) {
        rating = 'Good (2D)';
        color = '#ffff44';
    } else if (testResults.score >= 30) {
        rating = 'Fair (2D)';
        color = '#ff8844';
    }
    
    scoreRating.textContent = rating;
    scoreRating.style.color = color;
    
    // Load previous results
    loadPreviousResults();
    
    // Show results page
    document.querySelector('.test-results').style.display = 'block';
    
    // Show social sharing buttons
    showSocialSharing();
}

// Social sharing functions
function shareOnTwitter() {
    const url = encodeURIComponent('https://gpustresstest.online/');
    const text = encodeURIComponent(`I just tested my GPU and scored ${testResults.score}/100! Test your graphics card for free at`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    trackEvent('social_share', 'twitter');
}

function shareOnFacebook() {
    const url = encodeURIComponent('https://gpustresstest.online/');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    trackEvent('social_share', 'facebook');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent('https://gpustresstest.online/');
    const title = encodeURIComponent('GPU Stress Test Results');
    const summary = encodeURIComponent(`I scored ${testResults.score}/100 on GPU Stress Test Online!`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`, '_blank');
    trackEvent('social_share', 'linkedin');
}

function copyLink() {
    const url = 'https://gpustresstest.online/';
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
        trackEvent('social_share', 'copy_link');
    });
}

// Analytics event tracking
function trackEvent(action, category, label = '') {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
}

// Cookie consent handling
function initCookieConsent() {
    const consent = localStorage.getItem('cookie_consent');
    const consentBanner = document.getElementById('cookie-consent');
    
    if (!consent && consentBanner) {
        consentBanner.style.display = 'block';
    }
    
    const acceptBtn = document.querySelector('.cookie-accept');
    const declineBtn = document.querySelector('.cookie-decline');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'accepted');
            consentBanner.style.display = 'none';
            trackEvent('cookie_consent', 'accepted');
        });
    }
    
    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'declined');
            consentBanner.style.display = 'none';
            trackEvent('cookie_consent', 'declined');
        });
    }
}

// Show social sharing buttons after test completion
function showSocialSharing() {
    document.getElementById('share').style.display = 'block';
}

// Enhanced Three.js loading detection
function isThreeJSLoaded() {
    return typeof THREE !== 'undefined' && 
           THREE.WebGLRenderer && 
           THREE.Scene && 
           THREE.PerspectiveCamera && 
           THREE.Mesh &&
           THREE.BoxGeometry &&
           THREE.MeshPhongMaterial;
}

// Check browser WebGL compatibility
function checkBrowserCompatibility() {
    const compatibility = {
        webgl: false,
        webgl2: false,
        browser: navigator.userAgent,
        errors: []
    };
    
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        compatibility.webgl = !!gl;
        
        const gl2 = canvas.getContext('webgl2');
        compatibility.webgl2 = !!gl2;
        
        canvas.remove();
    } catch (e) {
        compatibility.errors.push('WebGL context creation failed: ' + e.message);
    }
    
    // Check for common blocking scenarios
    if (navigator.userAgent.indexOf('Chrome') > -1 && window.location.protocol === 'file:') {
        compatibility.errors.push('Chrome blocks WebGL on file:// protocol. Please use http:// or https://');
    }
    
    return compatibility;
}

// Advanced Three.js loading with timeout and retry
function waitForThreeJS(callback, maxWaitTime = 10000) {
    const startTime = Date.now();
    let checkInterval;
    let timeoutId;
    
    // Check compatibility first
    const compat = checkBrowserCompatibility();
    console.log('Browser compatibility check:', compat);
    
    if (!compat.webgl) {
        showError('Your browser does not support WebGL, which is required for GPU testing. Please update your browser or enable hardware acceleration.');
        return;
    }
    
    function checkThreeJS() {
        const elapsed = Date.now() - startTime;
        
        if (window.threeJSConfig && window.threeJSConfig.loaded && isThreeJSLoaded()) {
            console.log(`Three.js loaded successfully in ${elapsed}ms`);
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            callback(true);
            return;
        }
        
        if (window.threeJSConfig && window.threeJSConfig.error) {
            console.error('Three.js loading failed:', window.threeJSConfig.error);
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            showThreeJSError(window.threeJSConfig.error);
            return;
        }
        
        console.log(`Waiting for Three.js... ${elapsed}ms elapsed`);
    }
    
    // Start checking immediately and then every 100ms
    checkThreeJS();
    checkInterval = setInterval(checkThreeJS, 100);
    
    // Timeout after maxWaitTime
    timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        console.error('Three.js loading timeout after', maxWaitTime, 'ms');
        showThreeJSError('Three.js library loading timeout. This may be due to slow network or CDN issues.');
    }, maxWaitTime);
}

// Retry Three.js loading
function retryThreeJSLoading() {
    console.log('Retrying Three.js loading...');
    
    // Reset loading state
    if (window.threeJSConfig) {
        window.threeJSConfig.loaded = false;
        window.threeJSConfig.loading = false;
        window.threeJSConfig.error = null;
    }
    
    // Remove existing error display
    const errorContainer = document.getElementById('webgl-error');
    if (errorContainer) {
        errorContainer.remove();
    }
    
    // Try local backup if available
    if (window.threeJSConfig && window.threeJSConfig.localBackup) {
        const localUrls = [window.threeJSConfig.localBackup];
        window.loadThreeJS(localUrls, function(success) {
            if (success) {
                window.dispatchEvent(new CustomEvent('threejs-loaded'));
            } else {
                showThreeJSError('All loading attempts failed, including local backup.');
            }
        });
    } else {
        // Retry with original CDN list
        if (window.loadThreeJS && window.threeJSConfig) {
            window.loadThreeJS(window.threeJSConfig.cdnList, function(success) {
                if (success) {
                    window.dispatchEvent(new CustomEvent('threejs-loaded'));
                } else {
                    showThreeJSError('Retry failed. All CDN sources are unavailable.');
                }
            });
        }
    }
}

// Show Three.js specific error message
function showThreeJSError(message) {
    let errorContainer = document.getElementById('webgl-error');
    
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'webgl-error';
        errorContainer.className = 'webgl-error';
        document.body.appendChild(errorContainer);
    }
    
    const compat = checkBrowserCompatibility();
    let troubleshooting = '<ul>';
    troubleshooting += '<li>Check your internet connection</li>';
    troubleshooting += '<li>Try refreshing the page</li>';
    troubleshooting += '<li>Disable ad blockers or content filters</li>';
    troubleshooting += '<li>Try a different browser (Chrome, Firefox, Edge)</li>';
    if (!compat.webgl) {
        troubleshooting += '<li>Enable hardware acceleration in your browser</li>';
        troubleshooting += '<li>Update your graphics drivers</li>';
    }
    troubleshooting += '</ul>';
    
    errorContainer.innerHTML = `
        <div class="error-content">
            <h3>🚫 3D Graphics Library Error</h3>
            <p><strong>Error:</strong> ${message}</p>
            <details>
                <summary>Browser Information</summary>
                <p><strong>WebGL Support:</strong> ${compat.webgl ? 'Yes' : 'No'}</p>
                <p><strong>WebGL2 Support:</strong> ${compat.webgl2 ? 'Yes' : 'No'}</p>
                <p><strong>Browser:</strong> ${compat.browser}</p>
                ${compat.errors.length > 0 ? `<p><strong>Errors:</strong> ${compat.errors.join(', ')}</p>` : ''}
            </details>
            <details>
                <summary>Troubleshooting Steps</summary>
                ${troubleshooting}
            </details>
            <div class="error-actions">
                <button onclick="retryThreeJSLoading()" class="retry-btn">Retry Loading</button>
                <button onclick="location.reload()" class="reload-btn">Reload Page</button>
                <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="close-btn">Close</button>
            </div>
        </div>
    `;
    errorContainer.style.display = 'block';
}

// Show general error message in UI
function showError(message) {
    let errorContainer = document.getElementById('webgl-error');
    
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'webgl-error';
        errorContainer.className = 'webgl-error';
        document.body.appendChild(errorContainer);
    }
    
    errorContainer.innerHTML = `
        <div class="error-content">
            <h3>⚠️ Graphics Error</h3>
            <p>${message}</p>
            <div class="error-actions">
                <button onclick="location.reload()" class="retry-btn">Retry</button>
                <button onclick="this.parentElement.parentElement.parentElement.style.display='none'" class="close-btn">Close</button>
            </div>
        </div>
    `;
    errorContainer.style.display = 'block';
}

// Enhanced WebGL support detection
function detectWebGLSupport() {
    const canvas = document.createElement('canvas');
    const contexts = ['webgl2', 'webgl', 'experimental-webgl'];
    let gl = null;
    let webglVersion = null;
    
    for (let i = 0; i < contexts.length; i++) {
        try {
            gl = canvas.getContext(contexts[i]);
            if (gl) {
                webglVersion = contexts[i] === 'webgl2' ? '2.0' : '1.0';
                break;
            }
        } catch (e) {
            console.warn(`Failed to get ${contexts[i]} context:`, e);
        }
    }
    
    if (!gl) {
        return {
            supported: false,
            version: null,
            error: 'WebGL is not supported by your browser or graphics hardware.'
        };
    }
    
    // Check for common WebGL extensions
    const extensions = {
        loseContext: gl.getExtension('WEBGL_lose_context'),
        debugRenderer: gl.getExtension('WEBGL_debug_renderer_info'),
        anisotropic: gl.getExtension('EXT_texture_filter_anisotropic'),
        vertexArrayObject: gl.getExtension('OES_vertex_array_object')
    };
    
    // Clean up test canvas
    canvas.remove();
    
    return {
        supported: true,
        version: webglVersion,
        extensions: extensions,
        error: null
    };
}

// Application initialization
function initializeApplication() {
    console.log('🏃‍♂️ Initializing GPU Stress Test application...');
    
    // Debug: Current application state
    console.log('🔍 Application state during initialization:', {
        appMode: appMode,
        threeJSConfig: window.threeJSConfig,
        documentReady: document.readyState,
        timestamp: new Date().toISOString()
    });
    
    // Initialize cookie consent immediately
    initCookieConsent();
    
    // Wait for Three.js to load before initializing
    waitForThreeJS((success) => {
        console.log('🎯 Three.js loading result:', success);
        
        if (success) {
            console.log('✅ Three.js loaded successfully, checking WebGL support...');
            // First check WebGL support
            const webglSupport = detectWebGLSupport();
            console.log('🔍 WebGL support check:', webglSupport);
            
            if (!webglSupport.supported) {
                console.error('❌ WebGL not supported:', webglSupport.error);
                showError(webglSupport.error + ' Please ensure your browser supports WebGL and hardware acceleration is enabled.');
                return;
            }
            
            console.log(`WebGL ${webglSupport.version} detected`);
            
            // Now safely initialize the application in 3D mode
            if (init3DMode()) {
                console.log('✅ 3D mode initialized successfully');
            } else {
                console.log('🔄 3D mode failed, falling back to 2D mode');
                init2DMode();
            }
        } else {
            console.log('🔄 Three.js not available, initializing 2D fallback mode');
            init2DMode();
        }
    });
}

// Event listeners for Three.js loading
window.addEventListener('threejs-loaded', () => {
    console.log('Three.js loaded event received');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApplication);
    } else {
        initializeApplication();
    }
});

window.addEventListener('threejs-failed', () => {
    console.error('Three.js failed to load event received');
    showThreeJSError('Failed to load Three.js library from all CDN sources.');
});

// Debug function for manual button testing (can be called from console)
window.debugButtonTest = function() {
    console.log('🧪 Manual button test initiated...');
    
    // Try multiple ways to find the button
    const methods = [
        { name: '.start-test-btn selector', element: document.querySelector('.start-test-btn') },
        { name: 'First button', element: document.querySelector('button') },
        { name: 'Button with start in class', element: document.querySelector('[class*="start"]') },
        { name: 'Button containing "Start" text', element: Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Start')) }
    ];
    
    console.log('🔍 Testing button detection methods:');
    methods.forEach(method => {
        console.log(`  ${method.name}:`, !!method.element, method.element);
    });
    
    // Try to click the first available button
    const startButton = methods.find(m => m.element)?.element;
    
    if (startButton) {
        console.log('✅ Found button, attempting click:', startButton);
        console.log('🔍 Button state before click:', {
            disabled: startButton.disabled,
            style: startButton.style.display,
            className: startButton.className
        });
        
        try {
            startButton.click();
            console.log('✅ Click executed successfully');
        } catch (error) {
            console.error('❌ Click failed:', error);
        }
    } else {
        console.error('❌ NO START BUTTON FOUND by any method');
        console.log('🔍 Available buttons:', Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.textContent?.trim(),
            class: b.className
        })));
    }
};

// Direct function to force show level selection (bypass all app logic)
window.debugShowLevelSelection = function() {
    console.log('🚨 FORCING LEVEL SELECTION DISPLAY');
    
    try {
        // Force hide hero section
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.display = 'none';
            console.log('✅ Hero hidden forcefully');
        }
        
        // Force show level selection
        const levelSelection = document.querySelector('.level-selection');
        if (levelSelection) {
            levelSelection.style.display = 'block';
            console.log('✅ Level selection shown forcefully');
            console.log('🔍 Level selection innerHTML:', levelSelection.innerHTML.substring(0, 200) + '...');
        } else {
            console.error('❌ Level selection element not found in DOM');
            console.log('🔍 All elements with "level":', document.querySelectorAll('[class*="level"]'));
        }
        
        // Force hide other sections
        const testResults = document.querySelector('.test-results');
        if (testResults) {
            testResults.style.display = 'none';
            console.log('✅ Test results hidden');
        }
        
        // Reset scroll
        window.scrollTo(0, 0);
        console.log('✅ Scroll reset');
        
    } catch (error) {
        console.error('❌ Error forcing level selection:', error);
    }
};

// Debug function to check current state (can be called from console)
window.debugAppState = function() {
    console.log('🔍 Current App State:', {
        appMode: appMode,
        isTestRunning: isTestRunning,
        threeJSLoaded: window.threeJSConfig?.loaded,
        threeJSError: window.threeJSConfig?.error,
        isMobile: isMobile,
        totalButtons: document.querySelectorAll('button').length,
        startButtonExists: !!document.querySelector('.start-test-btn'),
        levelButtonsCount: document.querySelectorAll('.level-btn').length
    });
};

// Emergency function to manually bind events (can be called from console)
window.debugForceEventBinding = function() {
    console.log('🚨 Emergency event binding initiated...');
    
    const startButton = document.querySelector('.start-test-btn') || document.querySelector('button');
    
    if (startButton) {
        console.log('✅ Forcing event listener on button:', startButton);
        
        // Remove any existing listeners and add new ones
        const newButton = startButton.cloneNode(true);
        startButton.parentNode.replaceChild(newButton, startButton);
        
        newButton.addEventListener('click', function(e) {
            console.log('🎉 EMERGENCY CLICK HANDLER TRIGGERED!');
            e.preventDefault();
            
            console.log('Current app state:', appMode);
            
            if (appMode === 'loading') {
                console.log('App still loading, setting to 2D mode for test');
                appMode = '2d';
            }
            
            handleStartButtonClick();
        });
        
        console.log('✅ Emergency event listener attached successfully');
    } else {
        console.error('❌ No button found for emergency binding');
    }
};

// Function existence check utility
function checkFunctionExists(funcName) {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ Function ${funcName} exists`);
        return true;
    } else {
        console.error(`❌ Function ${funcName} not found`);
        return false;
    }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM fully loaded, starting comprehensive debugging...');
    
    // Check critical function existence
    console.log('🔍 Checking critical function existence:');
    checkFunctionExists('handleStartButtonClick');
    checkFunctionExists('showLevelSelection');
    checkFunctionExists('showFallbackLevelSelection');
    checkFunctionExists('init3DMode');
    checkFunctionExists('init2DMode');
    console.log('💡 Debug functions available:');
    console.log('  - debugButtonTest() - Test button clicking');
    console.log('  - debugAppState() - Check app state');  
    console.log('  - debugForceEventBinding() - Emergency event binding');
    console.log('  - debugShowLevelSelection() - Force show level selection');
    console.log('🎯 To test immediately, type: debugButtonTest()');
    console.log('🚨 If button shows About page instead: debugShowLevelSelection()');
    
    console.log('📊 DOM Load Status:', {
        readyState: document.readyState,
        timestamp: new Date().toISOString(),
        url: window.location.href
    });
    
    // Test multiple button selectors
    console.log('🔍 Testing multiple button selectors:');
    const startButton1 = document.querySelector('.start-test-btn');
    const startButton2 = document.querySelector('button');
    const startButton3 = document.querySelector('[class*="start"]');
    const startButton4 = document.querySelectorAll('button')[0];
    const startButton5 = document.getElementById('start-test-btn'); // Test ID selector
    
    console.log('✅ Selector .start-test-btn:', startButton1);
    console.log('✅ First button element:', startButton2);
    console.log('✅ Any element with "start" in class:', startButton3);
    console.log('✅ First button by index:', startButton4);
    console.log('✅ Button by ID (if exists):', startButton5);
    
    // Debug: Check all buttons in the document
    console.log('🔍 Complete button inventory:');
    const allButtons = document.querySelectorAll('button');
    console.log(`📊 Total buttons found: ${allButtons.length}`);
    
    if (allButtons.length === 0) {
        console.error('❌ NO BUTTONS FOUND AT ALL! This indicates a serious DOM issue.');
        console.log('🔍 Let\'s check the document body:', document.body);
        console.log('🔍 Let\'s check for any elements:', document.querySelectorAll('*').length);
    } else {
        allButtons.forEach((btn, index) => {
            const computedStyle = window.getComputedStyle(btn);
            console.log(`🔘 Button ${index + 1}:`, {
                text: btn.textContent?.trim(),
                className: btn.className,
                id: btn.id || 'no-id',
                tagName: btn.tagName,
                visible: computedStyle.display !== 'none',
                opacity: computedStyle.opacity,
                pointerEvents: computedStyle.pointerEvents,
                disabled: btn.disabled,
                parentElement: btn.parentElement?.tagName,
                parentClass: btn.parentElement?.className,
                element: btn
            });
            
            // Special check for start button
            if (btn.className.includes('start-test-btn') || btn.textContent?.includes('Start GPU Test')) {
                console.log(`🎯 FOUND START BUTTON at index ${index}!`, {
                    canClick: !btn.disabled && computedStyle.pointerEvents !== 'none',
                    boundingRect: btn.getBoundingClientRect(),
                    inViewport: btn.getBoundingClientRect().top >= 0
                });
            }
        });
    }
    
    // Debug: Check specific buttons
    const startButton = document.querySelector('.start-test-btn');
    console.log('🎯 Start button found:', startButton);
    if (startButton) {
        console.log('Start button details:', {
            text: startButton.textContent?.trim(),
            class: startButton.className,
            visible: window.getComputedStyle(startButton).display !== 'none',
            parent: startButton.parentElement?.tagName
        });
    }
    
    const levelButtons = document.querySelectorAll('.level-btn');
    console.log('🎯 Level buttons found:', levelButtons.length);
    levelButtons.forEach((btn, index) => {
        console.log(`Level button ${index + 1}:`, {
            text: btn.textContent?.trim(),
            class: btn.className,
            parent_level: btn.closest('.level-card')?.dataset?.level
        });
    });
    
    // Debug: Check DOM structure
    console.log('🏗️ DOM Structure Analysis:');
    const heroSection = document.querySelector('.hero');
    const container = document.querySelector('.container');
    const startButtonContainer = document.querySelector('.hero .container');
    
    console.log('- Hero section exists:', !!heroSection);
    console.log('- Container exists:', !!container);
    console.log('- Start button container exists:', !!startButtonContainer);
    
    if (startButtonContainer) {
        console.log('- Start button container innerHTML length:', startButtonContainer.innerHTML.length);
        console.log('- Start button container children:', startButtonContainer.children.length);
        
        // Look for the start button within its expected container
        const startBtnInContainer = startButtonContainer.querySelector('.start-test-btn');
        console.log('- Start button in container:', !!startBtnInContainer);
        
        if (!startBtnInContainer) {
            console.log('🔍 Searching for button-like elements in container:');
            const buttonLikeElements = startButtonContainer.querySelectorAll('*');
            Array.from(buttonLikeElements).forEach((el, index) => {
                if (el.tagName === 'BUTTON' || el.textContent?.includes('Start')) {
                    console.log(`  Found element ${index}:`, {
                        tag: el.tagName,
                        class: el.className,
                        text: el.textContent?.trim().substring(0, 50)
                    });
                }
            });
        }
    }
    
    // Debug: Check app state
    console.log('📱 App state debugging:');
    console.log('- App mode:', appMode);
    console.log('- Is mobile:', isMobile);
    console.log('- Test running:', isTestRunning);
    
    // Check if Three.js is already loaded
    if (window.threeJSConfig && window.threeJSConfig.loaded && isThreeJSLoaded()) {
        console.log('✅ Three.js already loaded, initializing immediately');
        initializeApplication();
    } else if (window.threeJSConfig && window.threeJSConfig.error) {
        console.error('❌ Three.js failed to load before DOM ready');
        showThreeJSError(window.threeJSConfig.error);
    } else {
        console.log('⏳ Waiting for Three.js loading to complete...');
        // The event listeners above will handle initialization
    }
    
    // BACKUP: Add direct event handler as last resort
    console.log('🔧 Adding backup event handler for start button...');
    setTimeout(() => {
        const startBtn = document.querySelector('.start-test-btn');
        if (startBtn) {
            // Add a backup click handler with higher priority
            startBtn.addEventListener('click', function(e) {
                console.log('🚨 BACKUP CLICK HANDLER ACTIVATED!');
                e.preventDefault();
                e.stopImmediatePropagation();
                
                // Force show level selection regardless of app state
                console.log('🎯 Forcing navigation to level selection...');
                document.querySelector('.hero').style.display = 'none';
                document.querySelector('.level-selection').style.display = 'block';
                if (document.querySelector('.test-results')) {
                    document.querySelector('.test-results').style.display = 'none';
                }
                window.scrollTo(0, 0);
                console.log('✅ Backup navigation completed');
            }, { capture: true }); // Use capture phase for higher priority
            console.log('✅ Backup event handler added');
        }
    }, 1000); // Wait 1 second to ensure DOM is fully ready
});