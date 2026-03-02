let classifier;
let reader;
const video = document.getElementById('webcam');
const canvas = document.getElementById('boxes');
const ctx = canvas.getContext('2d');

async function init() {
    // 1. Setup Edge Impulse AI
    classifier = new EdgeImpulseClassifier();
    await classifier.init();

    // 2. Start Camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        runAI();
    };
}

// 3. Serial Connection (Piezo)
document.getElementById('connect').onclick = async () => {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    reader = decoder.readable.getReader();
    readSerial();
};

async function readSerial() {
    while (true) {
        const { value, done } = await reader.read();
        if (value) {
            const vib = parseInt(value.trim());
            document.getElementById('v-val').innerText = vib;
            if (vib > 500) triggerAlert("⚠️ IMPACT DETECTED");
        }
    }
}

async function runAI() {
    // classifier.classify takes image data from your webcam
    const results = await classifier.classify(getFrameData());
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Bounding Boxes
    results.results.forEach(obj => {
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    });

    // Congestion logic based on pedestrian count
    if (results.results.length > 5) triggerAlert("⛔ CONGESTION DETECTED");
    
    requestAnimationFrame(runAI);
}

function triggerAlert(msg) {
    const card = document.getElementById('status');
    card.innerText = msg;
    card.className = "alert";
}

init();