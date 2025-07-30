document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('trash-result-container');

    async function fetchTrashedItems() {
        try {
            const res = await fetch('/api/trash');
            if (!res.ok) throw new Error('Failed to load trash items.');

            const products = await res.json();
            if (products.length === 0) {
                container.innerHTML = '<p>The trash is empty.</p>';
                return;
            }

            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th class="action-cell">Actions</th>
                    </tr>
                </thead>`;
            const tbody = document.createElement('tbody');
            products.forEach(p => {
                const tr = document.createElement('tr');
                tr.dataset.id = p.id;
                tr.innerHTML = `
                    <td data-label="Code">${p.product_code}</td>
                    <td data-label="Name">${p.name}</td>
                    <td data-label="Category">${p.category}</td>
                    <td class="action-cell">
                        <div class="button-group">
                            <button class="button-secondary restore-btn">Restore</button>
                            <button class="button-danger delete-forever-btn">Delete Forever</button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.innerHTML = '';
            container.appendChild(table);

        } catch (err) {
            container.innerHTML = `<p style="color: var(--danger-color);">${err.message}</p>`;
        }
    }

    // Event delegation for dynamically created buttons
    container.addEventListener('click', async (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = row.dataset.id;

        if (e.target.classList.contains('restore-btn')) {
            if (confirm('Are you sure you want to restore this item?')) {
                await fetch(`/api/product/${id}/restore`, { method: 'PUT' });
                row.remove();
            }
        }

        if (e.target.classList.contains('delete-forever-btn')) {
            if (confirm('WARNING: This action is permanent and cannot be undone. Are you sure?')) {
                await fetch(`/api/product/${id}`, { method: 'DELETE' });
                row.remove();
            }
        }
    });

    fetchTrashedItems();
});