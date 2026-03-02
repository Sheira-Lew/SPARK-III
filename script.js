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
// Mobile browsers require a physical click to unlock the camera.
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Initializing...";

    try {
        // Initialize the Edge Impulse WebAssembly engine
        classifier = new EdgeImpulseClassifier();
        await classifier.init();
        
        // Start the Camera with the updated flexible function
        await startCamera();
        
        // If successful, hide the button and start the AI loop
        startBtn.style.display = 'none';
        isRunning = true;
        requestAnimationFrame(runInference);
        
        console.log("System Online and AI Running");
    } catch (err) {
        console.error("Startup Error:", err);
        startBtn.innerText = "Error: Check Permissions";
        startBtn.disabled = false;
    }
});

// 3. UPDATED: Flexible Camera Function
async function startCamera() {
    // Requesting video with 'environment' (back camera) preference
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 }
        },
        audio: false
    });

    video.srcObject = stream;

    // Use a Promise to ensure the video hardware is fully ready
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.play(); // Force play for mobile browsers
            resolve();
        };
    });
}

// 4. The AI Inference Loop
async function runInference() {
    if (!isRunning) return;

    // Match canvas dimensions to the actual video stream size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Extract image data to send to the AI model
    const imgData = getFrameData();
    
    // Perform classification (Object Detection)
    const result = await classifier.classify(imgData);
    const objects = result.results;

    // Clear the "glass" overlay before drawing new boxes
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update the UI counter
    const count = objects.length;
    countBadge.innerText = count;

    // Draw bounding boxes around detected pedestrians
    objects.forEach(obj => {
        ctx.strokeStyle = "#00FF00"; // Bright Green
        ctx.lineWidth = 4;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    });

    // 5. Traffic Logic (Red/Green Alerts)
    if (count >= 5) { 
        statusLabel.innerText = "⚠️ CONGESTION!";
        statusCard.className = "status-jam"; 
    } else {
        statusLabel.innerText = "ROAD CLEAR";
        statusCard.className = "status-ok";
    }

    // Keep the loop running
    requestAnimationFrame(runInference);
}

// Helper to grab pixels from the video feed
function getFrameData() {
    const tempCanvas = document.createElement('canvas');
    // Ensure these dimensions match your Edge Impulse Model (e.g., 320x320)
    const modelSize = 320; 
    tempCanvas.width = modelSize;
    tempCanvas.height = modelSize;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(video, 0, 0, modelSize, modelSize);
    return tCtx.getImageData(0, 0, modelSize, modelSize).data;
}
