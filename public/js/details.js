document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const resultDiv = document.getElementById('detailsResult');
    const productNameH1 = document.getElementById('productName');

    if (!code) {
        productNameH1.textContent = 'Error';
        resultDiv.innerHTML = '<p>No product code provided.</p>';
        return;
    }
    
    try {
        const res = await fetch(`/api/product/${code}`);
        if (!res.ok) throw new Error('Product not found');
        const item = await res.json();
        productNameH1.textContent = item.name;
        resultDiv.innerHTML = `
            <div class="detail-view">
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Status:</strong> ${item.status}</p>
                <p><strong>Purchase Date:</strong> ${item.purchase_date || 'N/A'}</p>
                <p><strong>Warranty Expiry:</strong> ${item.warranty_date || 'N/A'}</p>
                <p><strong>Notes:</strong> ${item.notes || 'None'}</p>
                <p><strong>Invoice:</strong> ${item.invoice_path ? `<a href="/${item.invoice_path}" target="_blank">View Invoice</a>` : 'Not uploaded'}</p>
                <div class="button-group" style="margin-top: 2rem;">
                    <a href="/edit.html?code=${item.product_code}" class="button">Edit Product</a>
                </div>
            </div>
            <div class="qr-code-container">
                <h2>Product QR Code</h2>
                <div id="qrcode"></div>
                <div class="product-code-label">${item.product_code}</div>
            </div>
            `;
        
        // Generate QR Code
        new QRCode(document.getElementById("qrcode"), {
            text: item.product_code,
            width: 128,
            height: 128
        });

    } catch(err) {
        productNameH1.textContent = 'Error';
        resultDiv.innerHTML = `<p style="color: var(--danger-color);">${err.message}</p>`;
    }
});