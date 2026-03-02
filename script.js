// 1. Setup variables
const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const statusLabel = document.getElementById('status-label');
const statusCard = document.getElementById('status-card');
const countBadge = document.getElementById('count-badge');

let classifier;
let isRunning = false;

// 2. The Start Button Logic (Required for Mobile)
startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Connecting Camera...";

    try {
        // Init the Edge Impulse WASM
        classifier = new EdgeImpulseClassifier();
        await classifier.init();
        
        // Start the Phone/PC Camera
        await startCamera();
        
        // Success! Hide button and start AI
        startBtn.style.display = 'none';
        isRunning = true;
        requestAnimationFrame(runInference);
        
    } catch (err) {
        console.error(err);
        startBtn.innerText = "Error: Check Permissions";
        startBtn.disabled = false;
    }
});

// 3. Camera Function (Optimized for Rear Camera)
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, 
        audio: false
    });
    video.srcObject = stream;
    return new Promise(resolve => video.onloadedmetadata = resolve);
}

// 4. The AI Loop
async function runInference() {
    if (!isRunning) return;

    // Adjust canvas to match video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Get image data from video
    const imgData = getFrameData();
    
    // Run the model
    const result = await classifier.classify(imgData);
    const objects = result.results;

    // Clear previous boxes
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update Counter
    const count = objects.length;
    countBadge.innerText = count;

    // Draw Bounding Boxes
    objects.forEach(obj => {
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 4;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    });

    // 5. CONGESTION ALERT LOGIC
    if (count >= 5) { // Change '5' to your LEGO limit
        statusLabel.innerText = "⚠️ CONGESTION!";
        statusCard.className = "status-jam"; // Make sure this is in your CSS
    } else {
        statusLabel.innerText = "ROAD CLEAR";
        statusCard.className = "status-ok";
    }

    requestAnimationFrame(runInference);
}

// Helper to grab pixels from the video
function getFrameData() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 320; // Match your Edge Impulse model size
    tempCanvas.height = 320;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(video, 0, 0, 320, 320);
    return tCtx.getImageData(0, 0, 320, 320).data;
}
