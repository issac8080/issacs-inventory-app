const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const form = document.getElementById('editForm');
const resultDiv = document.getElementById('formResult');
let productData;

async function loadProductData() {
    if (!code) {
        form.innerHTML = '<p>No product code specified.</p>';
        return;
    }
    try {
        const res = await fetch(`/api/product/${code}`);
        if (!res.ok) throw new Error('Could not fetch product data.');
        productData = await res.json();
        
        form.innerHTML = `
            <input type="hidden" name="id" value="${productData.id}">
            <input type="hidden" name="existingInvoice" value="${productData.invoice_path || ''}">
            <label for="name">Product Name</label>
            <input type="text" id="name" name="name" value="${productData.name}" required>
            <label for="category">Category</label>
            <select id="category" name="category"></select>
            <label for="purchaseDate">Purchase Date</label>
            <input type="date" id="purchaseDate" name="purchaseDate" value="${productData.purchase_date}">
            <label for="warrantyDate">Warranty Expiry</label>
            <input type="date" id="warrantyDate" name="warrantyDate" value="${productData.warranty_date}">
            <label for="invoice">Upload New Invoice (optional)</label>
            <input type="file" id="invoice" name="invoice" accept="image/*,application/pdf">
            ${productData.invoice_path ? `<p>Current Invoice: <a href="/${productData.invoice_path}" target="_blank">View</a></p>` : ''}
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="4">${productData.notes || ''}</textarea>
            <button type="submit" class="button">Update Product</button>
        `;
        // Set category dropdown
        const categories = ['Electronics', 'Furniture', 'Appliances', 'Tools', 'Other'];
        const categorySelect = document.getElementById('category');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            if (cat === productData.category) option.selected = true;
            categorySelect.appendChild(option);
        });
    } catch (err) {
        form.innerHTML = `<p style="color: var(--danger-color);">${err.message}</p>`;
    }
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    resultDiv.textContent = 'Updating...';
    const formData = new FormData(this);
    formData.append('id', productData.id); // Ensure ID is passed

    try {
        const res = await fetch(`/api/product/${productData.id}`, { method: 'PUT', body: formData });
        const data = await res.json();
        if(data.success) {
            playSound('successSound');
            resultDiv.innerHTML = `<p style="color: var(--success-color);">✅ Product updated successfully!</p>`;
            setTimeout(() => window.location.href = `/details.html?code=${productData.product_code}`, 1500);
        } else {
            resultDiv.innerHTML = `<p style="color: var(--danger-color);">Update failed.</p>`;
        }
    } catch(err) {
        resultDiv.innerHTML = `<p style="color: var(--danger-color);">Error connecting to server.</p>`;
    }
});

document.addEventListener('DOMContentLoaded', loadProductData);