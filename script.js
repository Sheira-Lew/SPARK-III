// 1. Setup global variables for UI elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const statusLabel = document.getElementById('status-label');
const statusCard = document.getElementById('status-card');
const countBadge = document.getElementById('count-badge');

let classifier;
let isRunning = false;

// 2. The Start Button Logic
startBtn.addEventListener('click', async () => {
    // Disable button and update UI to show progress
    startBtn.disabled = true;
    startBtn.innerText = "Initializing AI...";

    try {
        // Step A: Initialize the Edge Impulse engine
        console.log("Loading model...");
        classifier = new EdgeImpulseClassifier();
        await classifier.init();
        
        // Step B: Start the Camera
        console.log("Requesting camera...");
        await startCamera();
        
        // Step C: Success! Hide button and start AI loop
        startBtn.style.display = 'none';
        isRunning = true;
        requestAnimationFrame(runInference);
        console.log("System Online");

    } catch (err) {
        console.error("Startup Failure:", err);
        // Display a more specific message if it's a permission issue
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            startBtn.innerText = "Error: Camera Blocked";
        } else {
            startBtn.innerText = "Error: Check Permissions";
        }
        startBtn.disabled = false;
    }
});

// 3. UPDATED: Flexible Camera Function
async function startCamera() {
    const constraints = {
        video: { 
            facingMode: "environment", // Prioritize back camera
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
    };

    // Request the stream
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    // Wait for hardware to be fully ready
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play(); // Force playback
            resolve();
        };
    });
}

// 4. The AI Inference Loop
async function runInference() {
    if (!isRunning) return;

    // Ensure drawing canvas matches video stream dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Grab frame and run classification
    const imgData = getFrameData();
    const result = await classifier.classify(imgData);
    const objects = result.results;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update the counter on screen
    const count = objects.length;
    countBadge.innerText = count;

    // Draw boxes around LEGO pedestrians
    objects.forEach(obj => {
        ctx.strokeStyle = "#00FF00"; // Green boxes
        ctx.lineWidth = 4;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    });

    // Update Status Card based on count
    if (count >= 5) { 
        statusLabel.innerText = "⚠️ CONGESTION!";
        statusCard.className = "status-jam"; 
    } else {
        statusLabel.innerText = "ROAD CLEAR";
        statusCard.className = "status-ok";
    }

    // Loop the next frame
    requestAnimationFrame(runInference);
}

// Helper to grab pixels from video feed for the AI
function getFrameData() {
    const tempCanvas = document.createElement('canvas');
    const modelSize = 320; // Must match your Edge Impulse project settings
    tempCanvas.width = modelSize;
    tempCanvas.height = modelSize;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(video, 0, 0, modelSize, modelSize);
    return tCtx.getImageData(0, 0, modelSize, modelSize).data;
}
