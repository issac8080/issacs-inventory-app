document.addEventListener('DOMContentLoaded', () => {
    const items = JSON.parse(localStorage.getItem('auditListForPrinting'));
    const container = document.getElementById('print-container');

    if (!items || items.length === 0) {
        container.innerHTML = '<h1>No items to print.</h1>';
        return;
    }

    let reportHTML = `
        <h1>Inventory Audit Report</h1>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    items.forEach(item => {
        reportHTML += `
            <tr>
                <td>${item.product_code}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.status}</td>
            </tr>
        `;
    });
    reportHTML += `</tbody></table>`;
    container.innerHTML = reportHTML;

    // Optional: Auto-trigger print dialog
    // window.print();
});