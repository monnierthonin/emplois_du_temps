// Global stats chart manager to allow live refresh after assignments
// Exposes window.StatsChartManager.refresh()

(function () {
  const state = {
    chart: null,
    initialized: false,
  };

  function colorForIndex(i) {
    const hue = (i * 47) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }

  async function fetchStats() {
    const resp = await fetch(`${API_BASE_URL}/statistiques`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  }

  function buildDatasets(datasetsRaw) {
    return datasetsRaw.map((d, i) => {
      const color = colorForIndex(i);
      return {
        label: d.label,
        data: d.data,
        borderColor: color,
        backgroundColor: color,
        pointRadius: 2,
        borderWidth: 2,
        fill: false,
        tension: 0.2,
      };
    });
  }

  async function init() {
    if (state.initialized) return;
    const canvas = document.getElementById('stats-chart');
    if (!canvas) return;
    try {
      const data = await fetchStats();
      const rooms = data.rooms || [];
      const datasets = buildDatasets(data.datasets || []);
      const ctx = canvas.getContext('2d');
      // eslint-disable-next-line no-undef
      state.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: rooms,
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'nearest', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = ctx.parsed.y ?? 0;
                  return `${ctx.dataset.label}: ${val}`;
                },
              },
            },
            title: { display: true, text: 'Occurrences par salle (par infirmier)' },
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: "Nombre d'affectations" } },
            x: { title: { display: true, text: 'Salles' } },
          },
        },
      });
      state.initialized = true;
    } catch (e) {
      console.error('Erreur de chargement des statistiques:', e);
      const container = document.querySelector('.statistique-section .statistique-content');
      if (container) {
        const el = document.createElement('div');
        el.style.color = '#b00';
        el.style.fontSize = '0.9em';
        el.textContent = 'Impossible de charger les statistiques pour le moment.';
        container.appendChild(el);
      }
    }
  }

  async function refresh() {
    try {
      const data = await fetchStats();
      if (!state.chart) {
        await init();
        return;
      }
      // Update labels and datasets
      state.chart.data.labels = data.rooms || [];
      state.chart.data.datasets = buildDatasets(data.datasets || []);
      state.chart.update();
    } catch (e) {
      console.error('Erreur de rafraîchissement des statistiques:', e);
    }
  }

  window.StatsChartManager = { init, refresh };

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
