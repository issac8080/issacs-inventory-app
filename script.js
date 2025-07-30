// Function to play the beep sound
function playBeep() {
  const beep = document.getElementById("beep");
  if (beep) {
      beep.play().catch(e => console.error("Beep sound failed to play:", e));
  }
}

// Event listener for the product submission form
document.getElementById("productForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  const resultDiv = document.getElementById("result");

  try {
    const res = await fetch("/api/add-product", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      playBeep();
      resultDiv.innerHTML = `
        <p style="color: green;">✅ Product added successfully!</p>
        <p>Your new Product Code is:</p>
        <div class="product-code-display">${data.code}</div>
      `;
      this.reset(); // Clear the form
    } else {
      resultDiv.innerHTML = `<p style="color: red;">Error: ${data.error}</p>`;
    }
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: red;">Error: Could not connect to server.</p>`;
  }
});

// Function to perform the product lookup
async function lookup() {
  const code = document.getElementById("lookupCode").value.trim().toUpperCase();
  const resultDiv = document.getElementById("result");
  
  if (!code) {
      resultDiv.textContent = "Please enter a product code.";
      return;
  }

  try {
    const res = await fetch(`/api/product/${code}`);
    if (res.ok) {
      const item = await res.json();
      playBeep();
      resultDiv.innerHTML = `
        <h3>${item.name}</h3>
        <p><strong>Code:</strong> <span class="product-code-display">${item.product_code}</span></p>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Purchase Date:</strong> ${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Warranty Until:</strong> ${item.warranty_date ? new Date(item.warranty_date).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Notes:</strong> ${item.notes || 'None'}</p>
        ${item.invoice_path ? `<p><a href="/${item.invoice_path}" target="_blank">View Invoice</a></p>` : ''}
      `;
    } else {
      resultDiv.textContent = `Product with code ${code} not found.`;
    }
  } catch (error) {
     resultDiv.innerHTML = `<p style="color: red;">Error: Could not connect to server.</p>`;
  }
}

// Add event listeners for the lookup functionality
document.getElementById("lookupButton").addEventListener("click", lookup);
document.getElementById("lookupCode").addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    lookup();
  }
});