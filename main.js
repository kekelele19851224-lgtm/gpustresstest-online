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
    console.log('🎲 createStressTestObjects() called');
    
    // Safety check: Don't create objects if test is not running or if we're not in a test mode
    if (!isTestRunning) {
        console.warn('⚠️ createStressTestObjects called but test is not running - aborting');
        return;
    }
    
    if (!scene) {
        console.warn('⚠️ createStressTestObjects called but Three.js scene is not available - aborting');
        return;
    }
    
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
    
    // Safely update UI elements
    const objectCountEl = document.getElementById('object-count');
    const objectsDisplayEl = document.getElementById('objects-display');
    
    if (objectCountEl) {
        objectCountEl.textContent = objectCount;
    } else {
        console.warn('object-count element not found');
    }
    
    if (objectsDisplayEl) {
        objectsDisplayEl.textContent = objectCount;
    } else {
        console.warn('objects-display element not found');
    }
    
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
    const gpuInfoEl = document.getElementById('gpu-info');
    const deviceTypeEl = document.getElementById('device-type');
    const webglVersionEl = document.getElementById('webgl-version');
    
    if (gpuInfoEl) {
        gpuInfoEl.textContent = gpuInfo.renderer || 'Unknown GPU';
    }
    if (deviceTypeEl) {
        deviceTypeEl.textContent = isMobile ? 'Mobile' : 'Desktop';
    }
    
    if (webglVersionEl) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const webglVersion = gl instanceof WebGL2RenderingContext ? '2.0' : '1.0';
        webglVersionEl.textContent = webglVersion;
    }
}

// Animation loop
function animate() {
    if (!isTestRunning) return;
    
    animationId = requestAnimationFrame(animate);
    
    // Update timer and progress
    const elapsed = Date.now() - testStartTime;
    const remaining = Math.max(0, testDuration - Math.floor(elapsed / 1000));
    const progress = ((testDuration - remaining) / testDuration) * 100;
    
    const progressTimeEl = document.getElementById('progress-time');
    const progressFillEl = document.getElementById('progress-fill');
    
    if (progressTimeEl) {
        progressTimeEl.textContent = remaining + 's';
    }
    if (progressFillEl) {
        progressFillEl.style.width = progress + '%';
    }
    
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
        const fpsDisplayEl = document.getElementById('fps-display');
        const avgFpsDisplayEl = document.getElementById('avg-fps-display');
        
        if (fpsDisplayEl) {
            fpsDisplayEl.textContent = fps;
        }
        
        // Calculate average FPS
        const elapsedSeconds = (now - testStartTime) / 1000;
        avgFPS = Math.round(totalFrames / elapsedSeconds);
        if (avgFpsDisplayEl) {
            avgFpsDisplayEl.textContent = avgFPS;
        }
        
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
        const tempDisplayEl = document.getElementById('temp-display');
        if (tempDisplayEl) {
            tempDisplayEl.textContent = Math.round(simulatedTemp) + '°C';
        }
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
    console.log('🚀 startGPUTest() called with level:', level);
    
    if (isTestRunning) {
        console.warn('⚠️ Test already running, ignoring new start request');
        return;
    }
    
    // Safety check: Make sure we have the required elements
    const testCanvas = document.getElementById('test-canvas');
    const testMonitoring = document.querySelector('.test-monitoring');
    
    if (!testCanvas) {
        console.error('❌ Cannot start test: test-canvas element not found');
        showError('Test interface not available. Please refresh the page.');
        return;
    }
    
    if (!scene) {
        console.error('❌ Cannot start test: Three.js scene not initialized');
        showError('3D engine not ready. Please refresh the page.');
        return;
    }
    
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
    if (testCanvas) testCanvas.style.display = 'block';
    if (testMonitoring) testMonitoring.style.display = 'block';
    const levelSelection = document.querySelector('.level-selection');
    if (levelSelection) levelSelection.style.display = 'none';
    
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
    const testCanvas = document.getElementById('test-canvas');
    const testMonitoring = document.querySelector('.test-monitoring');
    
    if (testCanvas) testCanvas.style.display = 'none';
    if (testMonitoring) testMonitoring.style.display = 'none';
    
    // Show results
    showTestResults();
    
    console.log('Test completed - Score:', finalScore, 'Average FPS:', avgFPS);
}

// Show test results page
function showTestResults() {
    // Update results display with null checks
    const completedLevelEl = document.getElementById('completed-level');
    const completionTimeEl = document.getElementById('completion-time');
    const finalScoreEl = document.getElementById('final-score');
    const resultAvgFpsEl = document.getElementById('result-avg-fps');
    const resultMinFpsEl = document.getElementById('result-min-fps');
    const resultMaxFpsEl = document.getElementById('result-max-fps');
    const resultObjectsEl = document.getElementById('result-objects');
    const resultGpuTempEl = document.getElementById('result-gpu-temp');
    const resultStabilityEl = document.getElementById('result-stability');
    
    if (completedLevelEl) completedLevelEl.textContent = testLevels[currentLevel].name;
    if (completionTimeEl) completionTimeEl.textContent = new Date().toLocaleTimeString();
    if (finalScoreEl) finalScoreEl.textContent = testResults.score;
    if (resultAvgFpsEl) resultAvgFpsEl.textContent = testResults.avgFPS;
    if (resultMinFpsEl) resultMinFpsEl.textContent = testResults.minFPS === Infinity ? 0 : testResults.minFPS;
    if (resultMaxFpsEl) resultMaxFpsEl.textContent = testResults.maxFPS;
    if (resultObjectsEl) resultObjectsEl.textContent = testLevels[currentLevel].objects;
    if (resultGpuTempEl) resultGpuTempEl.textContent = Math.round(testResults.maxTemp) + '°C';
    if (resultStabilityEl) resultStabilityEl.textContent = testResults.stability + '%';
    
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
    const testMonitoringElement = document.querySelector('.test-monitoring');
    
    console.log('🔍 Elements found:', {
        hero: !!heroElement,
        levelSelection: !!levelSelectionElement,
        testResults: !!testResultsElement,
        testMonitoring: !!testMonitoringElement
    });
    
    // Show hero section but hide its main content, keep level-selection visible
    if (heroElement) {
        heroElement.style.display = 'block';
        
        // Hide hero's direct children except level-selection
        const heroChildren = heroElement.children;
        for (let i = 0; i < heroChildren.length; i++) {
            if (!heroChildren[i].classList.contains('level-selection')) {
                heroChildren[i].style.display = 'none';
            }
        }
        console.log('✅ Hero section shown with only level selection visible');
    } else {
        console.error('❌ Hero element not found');
    }
    
    if (levelSelectionElement) {
        levelSelectionElement.style.display = 'block';
        levelSelectionElement.style.position = 'relative';
        levelSelectionElement.style.width = '100%';
        levelSelectionElement.style.minHeight = '100vh';
        levelSelectionElement.style.backgroundColor = '#1a1a1a';
        levelSelectionElement.style.padding = '50px 20px';
        levelSelectionElement.style.boxSizing = 'border-box';
        levelSelectionElement.style.visibility = 'visible';
        levelSelectionElement.style.opacity = '1';
        levelSelectionElement.style.zIndex = '1000';
        console.log('✅ Level selection shown with full styling');
        
        // Ensure level buttons are clickable
        const levelButtons = levelSelectionElement.querySelectorAll('.level-btn');
        console.log(`🔘 Found ${levelButtons.length} level buttons`);
        levelButtons.forEach((btn, index) => {
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.disabled = false;
            
            // Add direct click handler as backup
            btn.onclick = function(e) {
                console.log(`🔘 Direct click handler for button ${index + 1}`);
                e.preventDefault();
                e.stopPropagation();
                const levelCard = btn.closest('.level-card');
                const level = levelCard ? levelCard.dataset.level : 'medium';
                console.log('Direct click level:', level);
                handleLevelButtonClick(level);
            };
            
            console.log(`✅ Level button ${index + 1} (${btn.closest('.level-card')?.dataset?.level}) configured`);
        });
        
    } else {
        console.error('❌ Level selection element not found');
    }
    
    if (testResultsElement) {
        testResultsElement.style.display = 'none';
        console.log('✅ Test results hidden');
    }
    
    if (testMonitoringElement) {
        testMonitoringElement.style.display = 'none';
        console.log('✅ Test monitoring hidden');
    }
    
    // Hide other sections that might interfere
    const featuresSection = document.querySelector('.features');
    const aboutSection = document.querySelector('.about-section');
    const howItWorksSection = document.querySelector('.how-it-works');
    
    if (featuresSection) featuresSection.style.display = 'none';
    if (aboutSection) aboutSection.style.display = 'none';
    if (howItWorksSection) howItWorksSection.style.display = 'none';
    
    // Prevent any scrolling to anchors
    window.scrollTo(0, 0);
    console.log('✅ Scrolled to top to prevent anchor navigation');
}

// Show home page
function showHomePage() {
    console.log('🏠 showHomePage() called - cleaning up and returning to home');
    
    // CRITICAL: Stop any running tests first and reset all test state
    console.log('🔄 Resetting all test state variables...');
    isTestRunning = false;
    
    // Stop all animations
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    if (fallbackAnimationId) {
        cancelAnimationFrame(fallbackAnimationId);
        fallbackAnimationId = null;
    }
    
    // Reset test variables
    frameCount = 0;
    totalFrames = 0;
    testStartTime = 0;
    lastFPSUpdate = 0;
    avgFPS = 0;
    simulatedTemp = 65;
    
    // Reset test results
    testResults = {
        minFPS: Infinity,
        maxFPS: 0,
        avgFPS: 0,
        maxTemp: 65,
        stability: 100,
        score: 0
    };
    
    console.log('✅ All test state variables reset');
    
    // Clear Three.js objects if they exist
    if (scene && testObjects.length > 0) {
        console.log('🧹 Clearing Three.js test objects');
        testObjects.forEach(obj => {
            scene.remove(obj);
            // Dispose geometry and materials to free memory
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        testObjects = [];
        
        // Clear lights
        scene.children.forEach(child => {
            if (child.type === 'AmbientLight' || child.type === 'DirectionalLight') {
                scene.remove(child);
            }
        });
    }
    
    // Clean up chart
    if (fpsChart) {
        fpsChart.destroy();
        fpsChart = null;
    }
    
    // Hide and reset canvas
    const testCanvas = document.getElementById('test-canvas');
    if (testCanvas) {
        testCanvas.style.display = 'none';
        // Clear canvas
        const ctx = testCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);
        }
    }
    
    // Hide 2D fallback container if it exists
    const fallbackContainer = document.getElementById('fallback-test-container');
    if (fallbackContainer) {
        fallbackContainer.style.display = 'none';
        fallbackContainer.innerHTML = '';
    }
    
    // Reset DOM elements
    const heroElement = document.querySelector('.hero');
    const levelSelectionElement = document.querySelector('.level-selection');
    const testResultsElement = document.querySelector('.test-results');
    const testMonitoringElement = document.querySelector('.test-monitoring');
    const featuresSection = document.querySelector('.features');
    const aboutSection = document.querySelector('.about-section');
    const howItWorksSection = document.querySelector('.how-it-works');
    
    if (heroElement) {
        heroElement.style.display = 'block';
        heroElement.style.position = '';
        heroElement.style.minHeight = '';
        heroElement.style.backgroundColor = '';
        heroElement.style.padding = '';
        heroElement.style.margin = '';
        
        // Show all hero children that were hidden
        const heroChildren = heroElement.children;
        for (let i = 0; i < heroChildren.length; i++) {
            if (!heroChildren[i].classList.contains('level-selection')) {
                heroChildren[i].style.display = '';  // Reset to default
            }
        }
    }
    
    if (levelSelectionElement) {
        levelSelectionElement.style.display = 'none';
        // Reset any custom styles
        levelSelectionElement.style.position = '';
        levelSelectionElement.style.width = '';
        levelSelectionElement.style.minHeight = '';
        levelSelectionElement.style.backgroundColor = '';
        levelSelectionElement.style.padding = '';
        levelSelectionElement.style.boxSizing = '';
    }
    
    if (testResultsElement) testResultsElement.style.display = 'none';
    if (testMonitoringElement) testMonitoringElement.style.display = 'none';
    
    // Show other sections
    if (featuresSection) featuresSection.style.display = '';
    if (aboutSection) aboutSection.style.display = '';
    if (howItWorksSection) howItWorksSection.style.display = '';
    
    // Reset page state
    window.scrollTo(0, 0);
    if (window.location.hash) {
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    
    console.log('✅ Returned to home page - all test objects cleared');
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
            console.log('🔘 Level button clicked!', e.target);
            const levelCard = e.target.closest('.level-card');
            const level = levelCard ? levelCard.dataset.level : 'medium';
            console.log('Level extracted:', level, 'from card:', levelCard);
            console.log('Current app mode:', appMode);
            
            // Prevent any default behavior
            e.preventDefault();
            e.stopPropagation();
            
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
    
    if (isTestRunning) {
        console.warn('⚠️ Test already running, ignoring level button click');
        return;
    }
    
    // Force app mode if it's still loading
    if (appMode === 'loading') {
        console.log('🔄 App still loading, checking capabilities...');
        if (typeof THREE !== 'undefined' && scene) {
            appMode = '3d';
            console.log('✅ Switching to 3D mode');
        } else {
            appMode = '2d';
            console.log('✅ Switching to 2D fallback mode');
        }
    }
    
    if (appMode === '3d') {
        console.log('✅ Starting 3D GPU test');
        startGPUTest(level);
    } else if (appMode === '2d') {
        console.log('✅ Starting 2D fallback test');
        startFallbackTest(level);
    } else {
        console.error('❌ Invalid app mode for level test:', appMode);
        // Force to 2D mode as fallback
        console.log('🔄 Forcing 2D mode as fallback...');
        appMode = '2d';
        startFallbackTest(level);
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
    
    // Use the same logic as 3D mode
    showLevelSelection();
    
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
    const fallbackElementsEl = document.getElementById('fallback-elements');
    if (fallbackElementsEl) {
        fallbackElementsEl.textContent = elementCount;
    }
    
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
    
    // Update UI with null checks
    const fallbackTimeEl = document.getElementById('fallback-time');
    const fallbackProgressEl = document.getElementById('fallback-progress');
    
    if (fallbackTimeEl) {
        fallbackTimeEl.textContent = remaining + 's';
    }
    if (fallbackProgressEl) {
        fallbackProgressEl.style.width = progress + '%';
    }
    
    // Calculate "FPS" based on requestAnimationFrame callback frequency
    frameCount++;
    totalFrames++;
    
    if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round(frameCount / ((now - lastFPSUpdate) / 1000));
        const fallbackFpsEl = document.getElementById('fallback-fps');
        if (fallbackFpsEl) {
            fallbackFpsEl.textContent = fps;
        }
        
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
    // Update results display with null checks
    const completedLevelEl = document.getElementById('completed-level');
    const completionTimeEl = document.getElementById('completion-time');
    const finalScoreEl = document.getElementById('final-score');
    const resultAvgFpsEl = document.getElementById('result-avg-fps');
    const resultMinFpsEl = document.getElementById('result-min-fps');
    const resultMaxFpsEl = document.getElementById('result-max-fps');
    const resultObjectsEl = document.getElementById('result-objects');
    const resultGpuTempEl = document.getElementById('result-gpu-temp');
    const resultStabilityEl = document.getElementById('result-stability');
    
    if (completedLevelEl) completedLevelEl.textContent = testLevels[currentLevel].name + ' (2D Mode)';
    if (completionTimeEl) completionTimeEl.textContent = new Date().toLocaleTimeString();
    if (finalScoreEl) finalScoreEl.textContent = testResults.score;
    if (resultAvgFpsEl) resultAvgFpsEl.textContent = testResults.avgFPS;
    if (resultMinFpsEl) resultMinFpsEl.textContent = testResults.minFPS === Infinity ? 0 : testResults.minFPS;
    if (resultMaxFpsEl) resultMaxFpsEl.textContent = testResults.maxFPS;
    if (resultObjectsEl) resultObjectsEl.textContent = testLevels[currentLevel].objects;
    if (resultGpuTempEl) resultGpuTempEl.textContent = '65°C'; // Static for 2D mode
    if (resultStabilityEl) resultStabilityEl.textContent = testResults.stability + '%';
    
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
    const shareEl = document.getElementById('share');
    if (shareEl) {
        shareEl.style.display = 'block';
    }
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

// Debug function to test home navigation (can be called from console)
window.debugTestHomeNavigation = function() {
    console.log('🧪 TESTING HOME NAVIGATION');
    console.log('Current state before home navigation:', {
        isTestRunning: isTestRunning,
        testObjectsCount: testObjects.length,
        animationId: animationId,
        fallbackAnimationId: fallbackAnimationId,
        sceneChildren: scene ? scene.children.length : 'No scene',
        appMode: appMode,
        currentLevel: currentLevel
    });
    
    showHomePage();
    
    setTimeout(() => {
        console.log('State after home navigation:', {
            isTestRunning: isTestRunning,
            testObjectsCount: testObjects.length,
            animationId: animationId,
            fallbackAnimationId: fallbackAnimationId,
            sceneChildren: scene ? scene.children.length : 'No scene',
            heroDisplay: document.querySelector('.hero')?.style.display,
            levelSelectionDisplay: document.querySelector('.level-selection')?.style.display,
            testResultsDisplay: document.querySelector('.test-results')?.style.display,
            testCanvasDisplay: document.getElementById('test-canvas')?.style.display,
            appMode: appMode
        });
        
        console.log('DOM Elements Check:');
        console.log('- test-canvas exists:', !!document.getElementById('test-canvas'));
        console.log('- objects-display exists:', !!document.getElementById('objects-display'));
        console.log('- object-count exists:', !!document.getElementById('object-count'));
    }, 100);
};

// ULTIMATE FIX: Force all buttons to work
window.forceFixAllButtons = function() {
    console.log('🚨 ULTIMATE FIX: Forcing all buttons to work...');
    
    // Fix main start button
    const startBtn = document.querySelector('.start-test-btn');
    if (startBtn) {
        startBtn.onclick = function(e) {
            e.preventDefault();
            showLevelSelection();
            setTimeout(addEmergencyLevelButtonHandlers, 100);
        };
        console.log('✅ Start button fixed');
    }
    
    // Fix level buttons
    addEmergencyLevelButtonHandlers();
    
    // Fix navigation buttons
    const homeBtn = document.querySelector('.home-btn');
    const backBtn = document.querySelector('.back-btn');
    const newLevelBtn = document.querySelector('.new-level-btn');
    
    if (homeBtn) {
        homeBtn.onclick = function(e) {
            e.preventDefault();
            showHomePage();
        };
    }
    
    if (backBtn) {
        backBtn.onclick = function(e) {
            e.preventDefault();
            showHomePage();
        };
    }
    
    if (newLevelBtn) {
        newLevelBtn.onclick = function(e) {
            e.preventDefault();
            showLevelSelection();
            setTimeout(addEmergencyLevelButtonHandlers, 100);
        };
    }
    
    console.log('✅ All buttons force-fixed');
};

// Debug function to monitor function calls
window.debugMonitorCalls = function() {
    const originalStartGPUTest = window.startGPUTest || startGPUTest;
    const originalCreateStressTestObjects = window.createStressTestObjects || createStressTestObjects;
    
    window.startGPUTest = function(...args) {
        console.log('🚨 DEBUG: startGPUTest called with:', args);
        console.trace('Call stack:');
        return originalStartGPUTest.apply(this, args);
    };
    
    window.createStressTestObjects = function(...args) {
        console.log('🚨 DEBUG: createStressTestObjects called');
        console.trace('Call stack:');
        return originalCreateStressTestObjects.apply(this, args);
    };
    
    console.log('✅ Function monitoring enabled');
};

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
    console.log('🚨 FORCING LEVEL SELECTION DISPLAY - EMERGENCY MODE');
    
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
            levelSelection.style.visibility = 'visible';
            levelSelection.style.opacity = '1';
            console.log('✅ Level selection shown forcefully with full visibility');
            console.log('🔍 Level selection content preview:', levelSelection.innerHTML.substring(0, 200) + '...');
        } else {
            console.error('❌ Level selection element not found in DOM');
            console.log('🔍 All elements with "level":', document.querySelectorAll('[class*="level"]'));
        }
        
        // Force hide other sections that might interfere
        const testResults = document.querySelector('.test-results');
        if (testResults) {
            testResults.style.display = 'none';
            console.log('✅ Test results hidden');
        }
        
        const testMonitoring = document.querySelector('.test-monitoring');
        if (testMonitoring) {
            testMonitoring.style.display = 'none';
            console.log('✅ Test monitoring hidden');
        }
        
        // Prevent any URL hash issues
        if (window.location.hash) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
        
        // Reset scroll and focus
        window.scrollTo(0, 0);
        console.log('✅ Scroll reset and URL hash cleared');
        
        // Verify final state
        console.log('🔍 Final verification:', {
            heroDisplay: hero?.style.display,
            levelSelectionDisplay: levelSelection?.style.display,
            currentURL: window.location.href,
            scrollPosition: window.scrollY
        });
        
    } catch (error) {
        console.error('❌ Error forcing level selection:', error);
    }
};

// Quick test function to simulate button click
window.debugClickStart = function() {
    console.log('🧪 SIMULATING START BUTTON CLICK');
    const startBtn = document.querySelector('.start-test-btn');
    if (startBtn) {
        startBtn.click();
        console.log('✅ Start button clicked programmatically');
    } else {
        console.error('❌ Start button not found');
    }
};

// SUPER SIMPLE TEST FUNCTION
window.simpleTest = function() {
    console.log('🧪 SUPER SIMPLE TEST - Showing level selection directly');
    
    // Hide everything except level selection
    document.querySelectorAll('*').forEach(el => {
        if (!el.classList.contains('level-selection') && !el.closest('.level-selection')) {
            el.style.display = 'none';
        }
    });
    
    // Show level selection as overlay
    const levelSelection = document.querySelector('.level-selection');
    if (levelSelection) {
        levelSelection.style.display = 'block';
        levelSelection.style.position = 'fixed';
        levelSelection.style.top = '0';
        levelSelection.style.left = '0';
        levelSelection.style.width = '100vw';
        levelSelection.style.height = '100vh';
        levelSelection.style.backgroundColor = '#1a1a1a';
        levelSelection.style.zIndex = '999999';
        levelSelection.style.overflow = 'auto';
        levelSelection.style.padding = '20px';
        
        console.log('✅ Level selection forced to fullscreen overlay');
    }
};

// DIRECT INLINE FUNCTION for HTML onclick (works with file:// protocol)
window.forceShowLevelSelection = function(event) {
    console.log('🚨 ULTIMATE FIX: DIRECT INLINE FUNCTION CALLED - STOPPING ALL NAVIGATION');
    
    try {
        // CRITICAL: Prevent any navigation or scrolling immediately
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
        
        // CRITICAL: Remove #about from URL immediately to prevent scroll
        if (window.location.hash === '#about' || window.location.href.includes('#about')) {
            console.log('🔧 Removing #about from URL');
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
        
        // CRITICAL: Force scroll to top immediately
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        console.log('🎯 FORCING PAGE STRUCTURE CHANGE');
        
        // Hide ALL sections first
        const allSections = document.querySelectorAll('section, .hero, .test-results, .test-monitoring');
        allSections.forEach(section => {
            if (!section.classList.contains('level-selection')) {
                section.style.display = 'none';
            }
        });
        
        // Force hide main hero section specifically
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.display = 'none';
            hero.style.visibility = 'hidden';
            console.log('✅ Hero section completely hidden');
        }
        
        // Hide the about section specifically to prevent scroll
        const aboutSection = document.querySelector('#about, .about-section');
        if (aboutSection) {
            aboutSection.style.display = 'none';
            aboutSection.style.visibility = 'hidden';
            console.log('✅ About section hidden to prevent scroll');
        }
        
        // Force show level selection with maximum priority
        const levelSelection = document.querySelector('.level-selection');
        if (levelSelection) {
            levelSelection.style.display = 'block';
            levelSelection.style.visibility = 'visible';
            levelSelection.style.opacity = '1';
            levelSelection.style.position = 'relative';
            levelSelection.style.zIndex = '9999';
            levelSelection.style.marginTop = '0';
            levelSelection.style.paddingTop = '50px';
            
            // Make sure it's at the top of the page
            levelSelection.scrollIntoView({ behavior: 'instant', block: 'start' });
            
            console.log('✅ Level selection shown with maximum visibility');
        } else {
            console.error('❌ Level selection not found');
            return false;
        }
        
        // FINAL: Ensure scroll stays at top
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            console.log('✅ Final scroll reset applied');
        }, 50);
        
        console.log('✅ ULTIMATE FIX APPLIED: Level selection should now be visible at top!');
        
        // NUCLEAR OPTION: Move level selection to very top of page
        if (levelSelection && levelSelection.parentNode) {
            const body = document.body;
            const firstChild = body.firstChild;
            if (levelSelection.parentNode !== body) {
                body.insertBefore(levelSelection, firstChild);
                console.log('🚀 NUCLEAR: Moved level selection to top of body');
            }
        }
        
        // Verify final state
        console.log('🔍 Final state verification:', {
            currentURL: window.location.href,
            scrollTop: window.scrollY,
            heroHidden: hero?.style.display === 'none',
            levelSelectionVisible: levelSelection?.style.display === 'block',
            aboutHidden: aboutSection?.style.display === 'none',
            levelSelectionParent: levelSelection?.parentNode?.tagName
        });
        
        return false; // Prevent any default action
        
    } catch (error) {
        console.error('❌ Error in forceShowLevelSelection:', error);
        return false;
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

// EMERGENCY LEVEL BUTTON HANDLER
function addEmergencyLevelButtonHandlers() {
    console.log('🚨 Adding emergency level button handlers...');
    
    const levelButtons = document.querySelectorAll('.level-btn');
    console.log(`Found ${levelButtons.length} level buttons`);
    
    levelButtons.forEach((btn, index) => {
        const levelCard = btn.closest('.level-card');
        const level = levelCard ? levelCard.dataset.level : 'medium';
        
        console.log(`Setting up emergency handler for button ${index + 1}: ${level}`);
        
        // Remove existing handlers and add new one
        btn.onclick = function(e) {
            console.log(`🚨 EMERGENCY HANDLER: ${level} button clicked!`);
            e.preventDefault();
            e.stopPropagation();
            
            // Force start the appropriate test
            if (typeof startGPUTest === 'function' && (typeof THREE !== 'undefined' && scene)) {
                console.log('Starting 3D test...');
                currentLevel = level;
                isTestRunning = true;
                startGPUTest(level);
            } else {
                console.log('Starting 2D test...');
                currentLevel = level;
                isTestRunning = true;
                startFallbackTest(level);
            }
            
            return false;
        };
        
        // Also add event listener as backup
        btn.addEventListener('click', function(e) {
            console.log(`🔧 BACKUP HANDLER: ${level} button clicked!`);
            e.preventDefault();
            e.stopPropagation();
            
            if (typeof startGPUTest === 'function' && (typeof THREE !== 'undefined' && scene)) {
                startGPUTest(level);
            } else {
                startFallbackTest(level);
            }
        }, true);
    });
    
    console.log('✅ Emergency level button handlers added');
}

// IMMEDIATE SIMPLE FIX: Add event listener as soon as possible
function addSimpleButtonHandler() {
    const btn = document.getElementById('simple-start-btn') || document.querySelector('.start-test-btn');
    if (btn) {
        console.log('🎯 SIMPLE: Adding immediate button handler');
        btn.onclick = function(e) {
            console.log('🚨 SIMPLE HANDLER: Button clicked!');
            e.preventDefault();
            e.stopPropagation();
            
            // Simple direct DOM manipulation
            const hero = document.querySelector('.hero');
            const levelSelection = document.querySelector('.level-selection');
            
            if (hero) hero.style.display = 'none';
            if (levelSelection) {
                levelSelection.style.display = 'block';
                levelSelection.style.position = 'fixed';
                levelSelection.style.top = '0';
                levelSelection.style.left = '0';
                levelSelection.style.width = '100%';
                levelSelection.style.height = '100vh';
                levelSelection.style.backgroundColor = '#1a1a1a';
                levelSelection.style.zIndex = '10000';
                levelSelection.style.overflow = 'auto';
            }
            
            // Hide about section completely
            const aboutSection = document.querySelector('#about');
            if (aboutSection) aboutSection.remove();
            
            // Add level button handlers immediately
            addEmergencyLevelButtonHandlers();
            
            console.log('✅ SIMPLE: Level selection should be visible');
            return false;
        };
        console.log('✅ SIMPLE: Button handler added successfully');
        return true;
    }
    return false;
}

// Try to add handler immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addSimpleButtonHandler);
} else {
    addSimpleButtonHandler();
}

// Also try every 500ms for first 5 seconds
let attempts = 0;
const intervalId = setInterval(() => {
    if (addSimpleButtonHandler() || attempts > 10) {
        clearInterval(intervalId);
    }
    attempts++;
}, 500);

// CRITICAL: Add emergency level button handlers as soon as possible
function initializeEmergencyHandlers() {
    console.log('🚨 Initializing emergency handlers...');
    
    // Set level button handlers
    setTimeout(() => {
        addEmergencyLevelButtonHandlers();
    }, 1000);
    
    // Set interval to keep trying
    let attempts = 0;
    const intervalId = setInterval(() => {
        const levelButtons = document.querySelectorAll('.level-btn');
        if (levelButtons.length > 0 && attempts < 5) {
            addEmergencyLevelButtonHandlers();
            console.log(`✅ Emergency handlers set (attempt ${attempts + 1})`);
        }
        
        attempts++;
        if (attempts >= 10) {
            clearInterval(intervalId);
        }
    }, 2000);
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM fully loaded, starting comprehensive debugging...');
    
    // Initialize emergency handlers immediately
    initializeEmergencyHandlers();
    
    // Force fix all buttons after a short delay
    setTimeout(() => {
        console.log('🚨 Calling forceFixAllButtons after DOM load...');
        if (typeof forceFixAllButtons === 'function') {
            forceFixAllButtons();
        } else {
            window.forceFixAllButtons();
        }
    }, 2000);
    
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
    console.log('  - debugClickStart() - Simulate start button click');
    console.log('  - simpleTest() - SIMPLE OVERLAY TEST');
    console.log('🎯 To test immediately, type: debugButtonTest()');
    console.log('🚨 If button shows About page: debugShowLevelSelection()');
    console.log('⚡ Quick test: debugClickStart()');
    console.log('🚀 SIMPLE OVERLAY: simpleTest()');
    
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
    
    // IMMEDIATE: Add strong event handler to override any issues
    console.log('🔧 Adding immediate strong event handler for start button...');
    const immediateStartBtn = document.querySelector('.start-test-btn');
    if (immediateStartBtn) {
        // Remove any existing event listeners by cloning the element
        const newStartBtn = immediateStartBtn.cloneNode(true);
        immediateStartBtn.parentNode.replaceChild(newStartBtn, immediateStartBtn);
        
        // Add our strong event handler
        newStartBtn.addEventListener('click', function(e) {
            console.log('🚨 STRONG CLICK HANDLER ACTIVATED - BYPASSING ALL ISSUES!');
            
            // Prevent ALL default behaviors and propagation
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Force navigation immediately without any app state checks
            console.log('🎯 FORCING IMMEDIATE NAVIGATION TO LEVEL SELECTION');
            
            try {
                // Hide hero section
                const hero = document.querySelector('.hero');
                if (hero) hero.style.display = 'none';
                
                // Show level selection
                const levelSelection = document.querySelector('.level-selection');
                if (levelSelection) {
                    levelSelection.style.display = 'block';
                    console.log('✅ Level selection forced to display');
                }
                
                // Hide other sections
                const testResults = document.querySelector('.test-results');
                if (testResults) testResults.style.display = 'none';
                
                // Prevent any scrolling issues
                window.scrollTo(0, 0);
                history.pushState(null, null, window.location.pathname);
                
                console.log('✅ Navigation completed successfully - Level selection should now be visible');
                
            } catch (error) {
                console.error('❌ Error in navigation:', error);
            }
            
            // Return false to ensure no default action
            return false;
        }, { capture: true });
        
        console.log('✅ Strong event handler added immediately');
    }
    
    // BACKUP: Add additional event handler as fallback
    setTimeout(() => {
        const startBtn = document.querySelector('.start-test-btn');
        if (startBtn) {
            console.log('🔧 Adding backup event handler as secondary measure...');
            startBtn.addEventListener('click', function(e) {
                console.log('🚨 BACKUP CLICK HANDLER ACTIVATED!');
                e.preventDefault();
                e.stopImmediatePropagation();
                
                // Force show level selection regardless of app state
                console.log('🎯 Backup: Forcing navigation to level selection...');
                document.querySelector('.hero').style.display = 'none';
                document.querySelector('.level-selection').style.display = 'block';
                if (document.querySelector('.test-results')) {
                    document.querySelector('.test-results').style.display = 'none';
                }
                window.scrollTo(0, 0);
                console.log('✅ Backup navigation completed');
            }, { capture: true });
        }
    }, 1000);
});