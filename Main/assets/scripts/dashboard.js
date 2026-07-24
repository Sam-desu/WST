// ─── LOAD SALES SUMMARY ───────────────────────────────────
function loadSummary(range) {
  fetch(`api/dashboard.php?range=${range}`)
    .then((res) => res.json())
    .then((data) => {
      // update summary numbers
      //TOTAL SALES
      document.getElementById("total-sales").textContent =
        "₱" + parseFloat(data.total_sales).toLocaleString();
      //TOTAL ORDERS
      document.getElementById("monthly-growth").textContent =
        data.total_orders + " Orders";
      //TOTAL USERS
      document.getElementById("total-users").textContent =
        data.total_customer + " Users";

      // update chart
      updateChart(data.labels, data.profits);

      // update top sellers table
      loadTopSellers();
    });
}

// ─── CHART ────────────────────────────────────────────────
let myChart;

function updateChart(labels, profits) {
  const ctx = document.getElementById("myChart");

  // destroy old chart first
  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Profit (₱)",
          data: profits,
          borderColor: "#493628",
          backgroundColor: "rgba(73, 54, 40, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#493628",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => "₱" + value.toLocaleString(),
          },
        },
      },
    },
  });
}

// ─── TOP SELLERS TABLE ────────────────────────────────────
function loadTopSellers() {
  fetch("api/dashboard.php?range=top-sellers")
    .then((res) => res.json())
    .then((data) => {
      const tbody = document.querySelector(".top-seller-container tbody");
      if (!tbody) return;

      if (!data.top_sellers || data.top_sellers.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4">No sales data yet</td>
          </tr>`;
        return;
      }

      tbody.innerHTML = data.top_sellers
        .map(
          (item) => `
        <tr>
          <td>${item.name}</td>
          <td>₱${item.price}</td>
          <td>${item.total_quantity}</td>
          <td>${item.total_orders}</td>
        </tr>
      `,
        )
        .join("");
    });
}

// ─── TIME RANGE DROPDOWN ──────────────────────────────────
document.getElementById("time-range").addEventListener("change", function () {
  loadSummary(this.value);
});

// ─── RUN ON PAGE LOAD ─────────────────────────────────────
loadSummary("today");
