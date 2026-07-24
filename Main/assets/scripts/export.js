async function exportDashboard() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ─── HEADER ───────────────────────────────────────────
    doc.setFontSize(20);
    doc.setTextColor(73, 54, 40); // your brown color
    doc.text('KapeBara Dashboard Report', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('Generated: ' + new Date().toLocaleDateString(), 14, 30);
    doc.text('Range: ' + document.getElementById('time-range').value, 14, 37);

    // ─── SALES SUMMARY ────────────────────────────────────
    doc.setFontSize(14);
    doc.setTextColor(73, 54, 40);
    doc.text('Sales Summary', 14, 50);

    const totalSales  = document.getElementById('total-sales').textContent;
    const totalOrders = document.getElementById('monthly-growth').textContent;

    doc.autoTable({
        startY: 55,
        head: [['Metric', 'Value']],
        body: [
            ['Total Sales',  totalSales],
            ['Total Orders', totalOrders],
        ],
        headStyles: {
            fillColor: [73, 54, 40]  // brown header
        },
        theme: 'grid'
    });

    // ─── TOP SELLERS TABLE ────────────────────────────────
    doc.setFontSize(14);
    doc.setTextColor(73, 54, 40);
    doc.text('Top Sellers', 14, doc.lastAutoTable.finalY + 15);

    // get top sellers data from your table
    const rows = [];
    document.querySelectorAll('.top-seller-container tbody tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length > 0) {
            rows.push([
                cells[0].textContent,  // name
                cells[1].textContent,  // price
                cells[2].textContent,  // quantity
                cells[3].textContent   // orders
            ]);
        }
    });

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Product', 'Price', 'Quantity Sold', 'Total Orders']],
        body: rows,
        headStyles: {
            fillColor: [73, 54, 40]
        },
        theme: 'grid'
    });

    // ─── CHART AS IMAGE ───────────────────────────────────
    const chartCanvas = document.getElementById('myChart');
    if (chartCanvas) {
        const chartImage = chartCanvas.toDataURL('image/png');

        doc.addPage(); // new page for chart
        doc.setFontSize(14);
        doc.setTextColor(73, 54, 40);
        doc.text('Sales Chart', 14, 20);
        doc.addImage(chartImage, 'PNG', 14, 25, 180, 90);
    }

    // ─── FOOTER ───────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
            `KapeBara | Page ${i} of ${pageCount}`,
            14,
            doc.internal.pageSize.height - 10
        );
    }

    // ─── SAVE FILE ────────────────────────────────────────
    const date     = new Date().toLocaleDateString().replace(/\//g, '-');
    const filename = `KapeBara-Dashboard-${date}.pdf`;
    doc.save(filename);
}