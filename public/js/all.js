// Store products globally on this page to be accessible by export/print functions
let allProductsData = [];

async function fetchProducts() {
    const container = document.getElementById('allProductsResult');
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        allProductsData = products; // Store data for later use

        if (products.length === 0) {
            container.innerHTML = '<p>No products found. <a href="/add">Add one now!</a></p>';
            // Disable buttons if no data
            document.getElementById('print-stickers-btn').disabled = true;
            document.getElementById('export-excel-btn').disabled = true;
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = `<thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Actions</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        products.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.innerHTML = `
                <td data-label="Code">${p.product_code}</td>
                <td data-label="Name">${p.name}</td>
                <td data-label="Category">${p.category}</td>
            `;
            tr.addEventListener('click', () => window.location.href = `/details.html?code=${p.product_code}`);

            const actionCell = document.createElement('td');
            actionCell.className = 'action-cell';
            actionCell.innerHTML = `<div class="button-group"><button class="button-danger">Delete</button></div>`;
            actionCell.querySelector('.button-danger').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                    deleteProduct(p.id, tr);
                }
            });
            tr.appendChild(actionCell);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.innerHTML = '';
        container.appendChild(table);
        
        // Enable buttons now that data is loaded
        document.getElementById('print-stickers-btn').disabled = false;
        document.getElementById('export-excel-btn').disabled = false;

    } catch (err) {
        container.innerHTML = '<p style="color: var(--danger-color);">Error loading products.</p>';
    }
}

async function deleteProduct(id, rowElement) {
    try {
        await fetch(`/api/product/${id}/delete`, { method: 'PUT' });
        rowElement.remove();
        // Refetch data to update the global list
        fetchProducts();
    } catch (err) {
        alert('Failed to delete product.');
    }
}

// --- New Functions for Export and Print ---
function exportToExcel() {
    if (allProductsData.length === 0) {
        alert("No products to export.");
        return;
    }
    // Create a new worksheet from the product data
    const worksheet = XLSX.utils.json_to_sheet(allProductsData);
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    // Trigger the file download
    XLSX.writeFile(workbook, "IssacsHomeInventory.xlsx");
}

function printStickers() {
    if (allProductsData.length === 0) {
        alert("No products to print.");
        return;
    }
    // Save the data to localStorage to pass it to the new page
    localStorage.setItem('productsForPrinting', JSON.stringify(allProductsData));
    // Open the print-stickers page in a new tab
    window.open('/print-stickers.html', '_blank');
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', fetchProducts);
document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
document.getElementById('print-stickers-btn').addEventListener('click', printStickers);