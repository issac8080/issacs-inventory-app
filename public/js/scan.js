// --- Global State Management ---
let cvReady = false, tesseractReady = false;
let tesseractWorker = null, html5Qrcode = null, activeStream = null;

const statusDiv = document.getElementById('scan-status');
const captureBtn = document.getElementById('capture-text-btn');

function onOpenCvReady() {
    cv.onRuntimeInitialized = () => {
        console.log("OpenCV is ready.");
        cvReady = true;
        checkIfOcrReady();
    };
}

// --- Tesseract Initialization (for performance) ---
async function initializeTesseract() {
    statusDiv.innerHTML = '<p>Initializing recognition engine (may be slow on first visit)...</p>';
    tesseractWorker = await Tesseract.createWorker('eng', 1);
    await tesseractWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    });
    tesseractReady = true;
    checkIfOcrReady();
}

function checkIfOcrReady() {
    if (cvReady && tesseractReady) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture Code';
        if (document.getElementById('qr-tab-content').classList.contains('active')) {
             statusDiv.innerHTML = '<p>Engine ready. Point camera at a QR Code.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const qrTabBtn = document.getElementById('qr-tab-btn');
    const ocrTabBtn = document.getElementById('ocr-tab-btn');
    const qrTabContent = document.getElementById('qr-tab-content');
    const ocrTabContent = document.getElementById('ocr-tab-content');
    const ocrResultContainer = document.getElementById('ocr-result-container');
    const ocrVideo = document.getElementById('ocr-video-element');
    const retryBtn = document.getElementById('retry-scan-btn');

    captureBtn.disabled = true;

    function onScanSuccess(decodedText) {
        // **FIX:** Added playSound directly here for immediate feedback.
        playSound('successSound');
        
        if (html5Qrcode && html5Qrcode.isScanning) {
            html5Qrcode.stop().catch(err => console.error("QR Scanner failed to stop.", err));
        }
        handleSuccess(decodedText, "QR Code Found");
    }

    function startQrScanner() {
        stopAllStreams();
        qrTabContent.classList.add('active');
        ocrTabContent.classList.remove('active');
        qrTabBtn.classList.add('active');
        ocrTabBtn.classList.remove('active');
        html5Qrcode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5Qrcode.start({ facingMode: "environment" }, config, onScanSuccess)
            .catch(err => statusDiv.innerHTML = `<p style="color: var(--danger-color);">Could not start QR scanner.</p>`);
    }

    async function activateOcrScanner() {
        stopAllStreams();
        ocrTabContent.classList.add('active');
        qrTabContent.classList.remove('active');
        ocrTabBtn.classList.add('active');
        qrTabBtn.classList.remove('active');
        ocrResultContainer.style.display = 'none';
        ocrVideo.style.display = 'block';
        try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            ocrVideo.srcObject = activeStream;
        } catch (err) {
            statusDiv.innerHTML = `<p style="color: var(--danger-color);">Could not start camera for scan.</p>`;
        }
    }

    qrTabBtn.addEventListener('click', startQrScanner);
    ocrTabBtn.addEventListener('click', activateOcrScanner);

    captureBtn.addEventListener('click', () => {
        if (!activeStream) return;
        ocrVideo.style.display = 'none';
        ocrResultContainer.style.display = 'block';
        playSound('successSound');
        const canvas = document.getElementById('ocr-snapshot');
        preprocessImage(ocrVideo, canvas);
        runRecognitionPipeline(canvas);
        stopAllStreams();
    });

    retryBtn.addEventListener('click', activateOcrScanner);
    
    // Initial Load
    initializeTesseract();
    startQrScanner();
});

function stopAllStreams() {
    if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => {});
    }
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
        activeStream = null;
    }
}

function preprocessImage(video, canvas) {
    const context = canvas.getContext('2d');
    const box = { x: 0.1, y: 0.35, width: 0.8, height: 0.3 };
    const sx = video.videoWidth * box.x, sy = video.videoHeight * box.y;
    const sWidth = video.videoWidth * box.width, sHeight = video.videoHeight * box.height;
    canvas.width = sWidth; canvas.height = sHeight;
    context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    let src = cv.imread(canvas);
    let processed = new cv.Mat();
    cv.cvtColor(src, processed, cv.COLOR_RGBA2GRAY, 0);
    cv.adaptiveThreshold(processed, processed, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    cv.imshow(canvas, processed);
    src.delete(); processed.delete();
}

async function runRecognitionPipeline(canvas) {
    statusDiv.innerHTML = `<p>Analyzing... (Attempt 1)</p>`;
    let result = await runSingleRecognition(canvas, 'standard');
    if (result.success) return handleSuccess(result.code, 'Text Found');

    statusDiv.innerHTML = `<p>Retrying with inverted colors... (Attempt 2)</p>`;
    result = await runSingleRecognition(canvas, 'inverted');
    if (result.success) return handleSuccess(result.code, 'Text Found');

    handleFailure();
}

async function runSingleRecognition(canvas, strategy) {
    let mat = cv.imread(canvas);
    if (strategy === 'inverted') cv.bitwise_not(mat, mat);
    
    const tempCanvas = document.createElement('canvas');
    cv.imshow(tempCanvas, mat);
    mat.delete();

    try {
        const { data: { text, confidence } } = await tesseractWorker.recognize(tempCanvas);
        const productCode = findProductCode(text);
        console.log(`Attempt (${strategy}) found: '${text}' with confidence ${confidence}. Code: ${productCode}`);
        if (productCode && confidence > 60) {
            return { success: true, code: productCode };
        }
    } catch (error) { console.error(`Recognition error on strategy ${strategy}:`, error); }
    return { success: false };
}

function findProductCode(text) {
    const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
    const match = cleanText.match(/ITEM\d+/gi);
    return match ? match[0].toUpperCase() : null;
}

function handleSuccess(code, type) {
    // playSound is already here, but the call in onScanSuccess ensures it's immediate
    playSound('successSound'); 
    statusDiv.innerHTML = `<p style="color: var(--success-color);">✅ ${type}: ${code}. Redirecting...</p>`;
    setTimeout(() => window.location.href = `/details.html?code=${code}`, 500);
}

function handleFailure() {
    playSound('errorSound');
    statusDiv.innerHTML = `<p style="color: var(--danger-color);">Could not recognize a valid code. For best results, please frame only the code in the box.</p>`;
}