export function downloadInvoice(orderData: any) {
  const invoiceHTML = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${orderData.orderNumber}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #000;
      }
      .company-info h1 {
        margin: 0;
        font-size: 32px;
        font-weight: bold;
      }
      .invoice-info {
        text-align: right;
      }
      .invoice-info h2 {
        margin: 0 0 10px 0;
        font-size: 24px;
      }
      .section {
        margin-bottom: 30px;
      }
      .section-title {
        font-size: 14px;
        font-weight: bold;
        color: #666;
        margin-bottom: 10px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .info-item {
        margin-bottom: 8px;
      }
      .info-label {
        color: #666;
        font-size: 12px;
      }
      .info-value {
        font-weight: bold;
        font-size: 14px;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .items-table th {
        background: #f5f5f5;
        padding: 12px;
        text-align: left;
        font-size: 12px;
        font-weight: bold;
        border-bottom: 2px solid #ddd;
      }
      .items-table td {
        padding: 12px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
      }
      .items-table tr:last-child td {
        border-bottom: none;
      }
      .totals {
        margin-top: 30px;
        text-align: right;
      }
      .total-row {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 8px;
      }
      .total-label {
        width: 150px;
        text-align: right;
        margin-right: 20px;
        color: #666;
      }
      .total-value {
        width: 100px;
        font-weight: bold;
      }
      .grand-total {
        font-size: 18px;
        padding-top: 10px;
        border-top: 2px solid #000;
        margin-top: 10px;
      }
      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        color: #666;
        font-size: 12px;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="invoice-container">
      <div class="header">
        <div class="company-info">
          <h1>MotoGT</h1>
          <p>Car Parts & Accessories</p>
        </div>
        <div class="invoice-info">
          <h2>INVOICE</h2>
          <div class="info-item">
            <div class="info-label">Invoice Number</div>
            <div class="info-value">${orderData.orderNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date</div>
            <div class="info-value">${new Date(
              orderData.createdAt
            ).toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">${orderData.status.toUpperCase()}</div>
          </div>
        </div>
      </div>
  
      <div class="section">
        <div class="info-grid">
          <div>
            <div class="section-title">SHIPPING ADDRESS</div>
            ${
              orderData.shippingAddress
                ? `
              <div class="info-item">
                <div class="info-value">${orderData.shippingAddress.addressLine1 || ""}</div>
                ${orderData.shippingAddress.addressLine2 ? `<div class="info-value">${orderData.shippingAddress.addressLine2}</div>` : ""}
                <div class="info-value">${orderData.shippingAddress.city || ""}, ${orderData.shippingAddress.state || ""} ${orderData.shippingAddress.postalCode || ""}</div>
                <div class="info-value">${orderData.shippingAddress.country || ""}</div>
              </div>
            `
                : '<div class="info-value">N/A</div>'
            }
          </div>
          <div>
            <div class="section-title">BILLING ADDRESS</div>
            ${
              orderData.billingAddress
                ? `
              <div class="info-item">
                <div class="info-value">${orderData.billingAddress.addressLine1 || ""}</div>
                ${orderData.billingAddress.addressLine2 ? `<div class="info-value">${orderData.billingAddress.addressLine2}</div>` : ""}
                <div class="info-value">${orderData.billingAddress.city || ""}, ${orderData.billingAddress.state || ""} ${orderData.billingAddress.postalCode || ""}</div>
                <div class="info-value">${orderData.billingAddress.country || ""}</div>
              </div>
            `
                : '<div class="info-value">N/A</div>'
            }
          </div>
        </div>
      </div>
  
      <div class="section">
        <div class="section-title">ORDER ITEMS</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderData.items
              .map(
                (item: any) => `
              <tr>
                <td>${item.product.translations[0].name}</td>
                <td>${item.quantity}</td>
                <td>JOD ${item.unitPrice}</td>
                <td>JOD ${(item.quantity * item.unitPrice).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
  
      <div class="totals">
        <div class="total-row">
          <div class="total-label">Subtotal:</div>
          <div class="total-value">JOD ${orderData.subtotalAmount || orderData.totalAmount}</div>
        </div>
        ${
          orderData.shippingAmount
            ? `
          <div class="total-row">
            <div class="total-label">Shipping:</div>
            <div class="total-value">JOD ${orderData.shippingAmount}</div>
          </div>
        `
            : ""
        }
        ${
          orderData.discountAmount
            ? `
          <div class="total-row">
            <div class="total-label">Discount:</div>
            <div class="total-value">-JOD ${orderData.discountAmount}</div>
          </div>
        `
            : ""
        }
        <div class="total-row grand-total">
          <div class="total-label">Total:</div>
          <div class="total-value">JOD ${orderData.totalAmount}</div>
        </div>
      </div>
  
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>For questions about this invoice, please contact support@motogt.com</p>
      </div>
    </div>
    <script>
      window.print();
    </script>
  </body>
  </html>
    `;

  // Create a blob and download
  const blob = new Blob([invoiceHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.click();
  URL.revokeObjectURL(url);
}
