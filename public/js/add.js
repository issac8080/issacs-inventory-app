const scanBtn = document.getElementById('scan-barcode-btn');
const fetchBtn = document.getElementById('fetch-by-barcode-btn');
const barcodeInput = document.getElementById('barcode-input');
const modal = document.getElementById('scanner-modal');
const closeModalBtn = document.querySelector('.modal-close');
const statusDiv = document.getElementById('barcode-lookup-status');
const modalStatus = document.getElementById('barcode-reader-status');
const scannerContainer = document.getElementById('scanner-container');

let activeStream;
let detectionInterval;
let scannerType = null; // To track which scanner is active: 'native' or 'quagga'

scanBtn.addEventListener('click', startBarcodeScanner);
closeModalBtn.addEventListener('click', stopBarcodeScanner);
window.addEventListener('click', e => { if (e.target === modal) stopBarcodeScanner(); });
fetchBtn.addEventListener('click', () => {
  const code = barcodeInput.value.trim();
  if (code) fetchProductDetails(code);
  else statusDiv.innerHTML = `<p style="color: var(--danger-color);">Please enter a barcode number.</p>`;
});

// --- SCANNER LOGIC ---

async function startBarcodeScanner() {
    modal.style.display = 'block';
    modalStatus.textContent = "Starting camera...";
    scannerContainer.innerHTML = ''; // Clear previous scanner instances

    // Strategy 1: Try the fast, native Browser API first
    if ('BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        scannerType = 'native';
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        scannerContainer.appendChild(video);

        try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = activeStream;
            await video.play();

            const barcodeDetector = new BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8'] });
            modalStatus.textContent = "Point camera at a product barcode.";
            
            detectionInterval = setInterval(async () => {
                try {
                    const barcodes = await barcodeDetector.detect(video);
                    if (barcodes.length > 0) onBarcodeScanSuccess(barcodes[0].rawValue);
                } catch (err) {}
            }, 200);
        } catch (err) {
            modalStatus.innerHTML = `<p style="color: var(--danger-color);">Could not start camera. Please grant permission.</p>`;
        }
    } else {
        // Fallback Strategy: Use the more compatible QuaggaJS library
        scannerType = 'quagga';
        startQuagga();
    }
}

function stopBarcodeScanner() {
    if (scannerType === 'native') {
        clearInterval(detectionInterval);
        if (activeStream) activeStream.getTracks().forEach(t => t.stop());
    } else if (scannerType === 'quagga') {
        Quagga.stop();
    }
    modal.style.display = 'none';
    scannerContainer.innerHTML = ''; // Clean up the container
}

function onBarcodeScanSuccess(barcode) {
  if (!barcode) return;
  playSound('successSound');
  stopBarcodeScanner();
  barcodeInput.value = barcode;
  fetchProductDetails(barcode);
}

// --- QUAGGA FALLBACK ---

function startQuagga() {
  modalStatus.textContent = "Starting fallback scanner...";
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: scannerContainer, // Attach Quagga to the container
      constraints: { facingMode: "environment" }
    },
    decoder: { readers: ["ean_reader", "upc_reader", "ean_8_reader"] }
  }, err => {
    if (err) {
      modalStatus.innerHTML = `<p style="color: var(--danger-color);">Fallback scanner failed to start.</p>`;
      return;
    }
    Quagga.start();
    modalStatus.textContent = "Point camera at a product barcode.";
  });

  Quagga.onDetected(data => {
    onBarcodeScanSuccess(data.codeResult.code);
  });
}

// --- API LOOKUP & FORM POPULATION ---

async function fetchProductDetails(barcode) {
  statusDiv.innerHTML = `<p>Fetching details for barcode: ${barcode}…</p>`;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}`);
    if (!res.ok) throw new Error('Barcode not found in the public database.');
    const data = await res.json();

    if (data.status === 1 && data.product) {
      populateForm(data.product, barcode);
      playSound('successSound');
      statusDiv.innerHTML = `<p style="color: var(--success-color);">✅ Details fetched successfully!</p>`;
    } else {
      throw new Error('Barcode not found. Please fill details manually.');
    }
  } catch (err) {
    playSound('errorSound');
    statusDiv.innerHTML = `<p style="color: var(--danger-color);">${err.message}</p>`;
  }
}

function populateForm(product, barcode) {
  document.getElementById('name').value = product.product_name_en || product.product_name || '';
  document.getElementById('notes').value =
    `Brand: ${product.brands || ''}\nQuantity: ${product.quantity || ''}\nBarcode: ${barcode}\n\n`;

  const cats = product.categories_tags || [];
  const select = document.getElementById('category');
  if (cats.some(c=>c.includes('electronic'))) select.value = 'Electronics';
  else if (cats.some(c=>c.includes('groceries'))) select.value = 'Groceries';
  else if (cats.some(c=>c.includes('appliances'))) select.value = 'Appliances';
  else select.value = 'Other';
}

// --- FORM SUBMISSION ---

document.getElementById('productForm').addEventListener('submit', async e => {
  e.preventDefault();
  const resultDiv = document.getElementById('formResult');
  resultDiv.innerHTML = `<p>Saving…</p>`;

  try {
    const res = await fetch('/api/add-product', {
      method: 'POST',
      body: new FormData(e.target)
    });
    const data = await res.json();

    if (data.success) {
      playSound('successSound');
      resultDiv.innerHTML = `
        <div style="text-align:center;">
          <p style="color: var(--success-color); font-weight:bold;">
            ✅ Product added successfully!
          </p>
          <div class="qr-code-container" style="margin-top:0;">
            <div id="new-qrcode"></div>
            <div class="product-code-label">${data.code}</div>
          </div>
        </div>`;
      new QRCode(document.getElementById("new-qrcode"), {
        text: data.code, width:128, height:128
      });
      e.target.reset();
      barcodeInput.value = '';
      statusDiv.innerHTML = '';
    } else {
      resultDiv.innerHTML = `<p style="color: var(--danger-color);">Error: ${data.error}</p>`;
    }
  } catch {
    resultDiv.innerHTML = `<p style="color: var(--danger-color);">Error: Could not connect to server.</p>`;
  }
});

// --- UTILITY ---
function playSound(id) {
  const s = document.getElementById(id);
  if (s) {
      s.currentTime = 0;
      s.play().catch(err => console.error("Sound play failed:", err));
  }
}