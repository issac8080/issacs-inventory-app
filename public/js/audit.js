document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('scan-status');
    const tableBody = document.querySelector('#scanned-items-table tbody');
    const itemCountSpan = document.getElementById('item-count');
    const selectAllCheckbox = document.getElementById('select-all-chk');

    let scannedItems = new Map(); // Use a Map to easily prevent duplicate scans

    // --- Scanner Initialization ---
    const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    html5QrcodeScanner.render(onScanSuccess, () => {});

    async function onScanSuccess(decodedText) {
        if (!decodedText.startsWith("ITEM") || scannedItems.has(decodedText)) {
            // Ignore non-item codes or duplicates
            return;
        }

        // **FIX:** Play sound immediately for instant feedback
        playSound('successSound');
        statusDiv.innerHTML = `<p style="color: var(--success-color);">Found: ${decodedText}. Fetching details...</p>`;
        
        try {
            const res = await fetch(`/api/product/${decodedText}`);
            if (!res.ok) throw new Error('Product not found in database.');
            
            const product = await res.json();
            
            scannedItems.set(product.product_code, product); // Add to our list
            renderTable();
            statusDiv.innerHTML = `<p style="color: var(--success-color);">Added: ${product.name}</p>`;

        } catch (error) {
            playSound('errorSound');
            statusDiv.innerHTML = `<p style="color: var(--danger-color);">${error.message}</p>`;
        }
    }

    // --- Table & UI Rendering ---
    function renderTable() {
        tableBody.innerHTML = ''; // Clear table
        scannedItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="item-chk" data-id="${item.id}"></td>
                <td>${item.product_code}</td>
                <td>${item.name}</td>
                <td>${item.status}</td>
            `;
            tableBody.appendChild(row);
        });
        itemCountSpan.textContent = scannedItems.size;
        selectAllCheckbox.checked = false; // Uncheck the "select all" box after rendering
    }

    // --- Bulk Action Logic ---
    async function performBatchAction(action) {
        const selectedIds = Array.from(document.querySelectorAll('.item-chk:checked')).map(chk => chk.dataset.id);
        
        if (selectedIds.length === 0) {
            alert('Please select items from the list first.');
            return;
        }

        const actionText = action === 'mark_damaged' ? 'mark as damaged' : 'delete';
        if (!confirm(`Are you sure you want to ${actionText} the ${selectedIds.length} item(s)?`)) {
            return;
        }

        try {
            const res = await fetch('/api/products/batch-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ids: selectedIds })
            });
            if (!res.ok) throw new Error('Server failed to process the request.');

            // Remove updated items from the local list and re-render
            const updatedProductCodes = await res.json();
            updatedProductCodes.forEach(code => scannedItems.delete(code));
            renderTable();
            alert(`${selectedIds.length} item(s) have been updated successfully.`);

        } catch (error) {
            alert(`An error occurred: ${error.message}`);
        }
    }
    
    // --- Event Listeners ---
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (scannedItems.size > 0 && confirm('Are you sure you want to clear the scanned items list?')) {
            scannedItems.clear();
            renderTable();
        }
    });
    
    selectAllCheckbox.addEventListener('click', (e) => {
        document.querySelectorAll('.item-chk').forEach(chk => chk.checked = e.target.checked);
    });

    document.getElementById('damage-btn').addEventListener('click', () => performBatchAction('mark_damaged'));
    document.getElementById('delete-btn').addEventListener('click', () => performBatchAction('delete'));
    document.getElementById('print-btn').addEventListener('click', () => {
        if(scannedItems.size === 0) {
            alert("No items to print.");
            return;
        }
        localStorage.setItem('auditListForPrinting', JSON.stringify(Array.from(scannedItems.values())));
        window.open('/print-audit.html', '_blank');
    });
});