async function lookupProduct() {
    const code = document.getElementById('lookupCode').value.trim().toUpperCase();
    const resultDiv = document.getElementById('lookupResult');
    if (!code) {
        resultDiv.textContent = 'Please enter a product code.';
        return;
    }
    resultDiv.innerHTML = `<p>Searching...</p>`;
    try {
        const res = await fetch(`/api/product/${code}`);
        if (res.ok) {
            const item = await res.json();
            playSound('successSound');
            resultDiv.innerHTML = `<p style="color: var(--success-color);">✅ Success! Redirecting...</p>`;
            // Delay redirect to allow sound to play
            setTimeout(() => {
                window.location.href = `/details.html?code=${item.product_code}`;
            }, 400);
        } else {
            playSound('errorSound');
            resultDiv.innerHTML = `<p style="color: var(--danger-color);">Product with code <strong>${code}</strong> not found.</p>`;
        }
    } catch (err) {
        playSound('errorSound');
        resultDiv.innerHTML = `<p style="color: var(--danger-color);">Error: Could not connect to server.</p>`;
    }
}
document.getElementById('lookupButton').addEventListener('click', lookupProduct);
document.getElementById('lookupCode').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        lookupProduct();
    }
});