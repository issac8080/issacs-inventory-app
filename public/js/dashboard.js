document.addEventListener('DOMContentLoaded', async () => {
    const totalItemsEl = document.getElementById('stats-total-items');
    const expiringSoonEl = document.getElementById('stats-expiring-soon');
    const trashItemsEl = document.getElementById('stats-trash-items');

    try {
        const response = await fetch('/api/dashboard-stats');
        if (!response.ok) {
            throw new Error('Failed to load stats');
        }
        const stats = await response.json();

        totalItemsEl.textContent = stats.totalItems;
        expiringSoonEl.textContent = stats.expiringSoon;
        trashItemsEl.textContent = stats.trashItems;

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        totalItemsEl.textContent = '-';
        expiringSoonEl.textContent = '-';
        trashItemsEl.textContent = '-';
    }
});