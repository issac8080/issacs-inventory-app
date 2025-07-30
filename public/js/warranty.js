document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('warranty-items-result');

    try {
        const response = await fetch('/api/products/expiring-soon');
        if (!response.ok) throw new Error('Failed to fetch data from server.');
        
        const products = await response.json();

        if (products.length === 0) {
            container.innerHTML = '<p>🎉 No products have warranties expiring in the next 30 days.</p>';
            return;
        }

        let tableHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th style="color: var(--danger-color);">Expires On</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        products.forEach(p => {
            tableHTML += `
                <tr class="clickable-row" data-code="${p.product_code}">
                    <td data-label="Code">${p.product_code}</td>
                    <td data-label="Name">${p.name}</td>
                    <td data-label="Status">${p.status}</td>
                    <td data-label="Expires On" style="color: var(--danger-color); font-weight: 600;">${p.warranty_date}</td>
                </tr>
            `;
        });
        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;

        // Add click listeners to the new table rows
        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                window.location.href = `/details.html?code=${row.dataset.code}`;
            });
        });

    } catch (error) {
        console.error('Failed to load expiring warranties:', error);
        container.innerHTML = `<p style="color: var(--danger-color);">${error.message}</p>`;
    }
});