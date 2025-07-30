document.addEventListener('DOMContentLoaded', () => {
    const products = JSON.parse(localStorage.getItem('productsForPrinting'));
    const container = document.getElementById('sticker-sheet-container');

    if (!products || products.length === 0) {
        container.innerHTML = '<p>No products found to print.</p>';
        return;
    }

    // **UPDATED:** Changed stickers per page to 32 (4 columns x 8 rows)
    const stickersPerPage = 32;
    let stickerCount = 0;
    let sheet;

    products.forEach(product => {
        // Create a new sheet every 32 stickers
        if (stickerCount % stickersPerPage === 0) {
            sheet = document.createElement('div');
            sheet.className = 'sticker-sheet';
            container.appendChild(sheet);
        }

        const sticker = document.createElement('div');
        sticker.className = 'sticker';

        const qrCodeDiv = document.createElement('div');
        qrCodeDiv.className = 'qr-code';

        const productName = document.createElement('div');
        productName.className = 'product-name';
        productName.textContent = product.name;

        const itemCode = document.createElement('div');
        itemCode.className = 'item-code';
        itemCode.textContent = product.product_code;

        sticker.appendChild(qrCodeDiv);
        sticker.appendChild(productName);
        sticker.appendChild(itemCode);
        sheet.appendChild(sticker);

        // **UPDATED:** Generate a smaller QR code to fit the new sticker size
        new QRCode(qrCodeDiv, {
            text: product.product_code,
            width: 45,
            height: 45,
            correctLevel: QRCode.CorrectLevel.M // M is more suitable for smaller QR codes
        });

        stickerCount++;
    });

    // Clean up the stored data
    localStorage.removeItem('productsForPrinting');
});