function dashboardApp() {
  return {
    sidebarOpen: window.innerWidth > 1024,
    inventory: [],
    allSales: [],
    sales: [],
    employeesList: [],
    selectedEmployee: 'All',
    period: 'daily',
    referenceDate: new Date().toISOString().split('T')[0],
    rangeFrom: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    rangeTo: new Date().toISOString().split('T')[0],
    showExpiringModal: false,
    showLowStockModal: false,
    isLoading: true,
    stats: {
      grossSales: 0,
      netSales: 0,
      grossProfit: 0,
      topMovingProduct: '',
      topMovingQty: 0,
      expiringCount: 0,
      lowStockCount: 0,
    },
    criticalItems: [],
    lowStockItems: [],
    charts: { sales: null },

    get todayFormatted() {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    get referenceDateStr() {
      return this.formatDateStr(this.referenceDate);
    },
    formatDateStr(d) {
      return d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
    },
    formatNum(n) {
      return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    init() {
      const checkDB = setInterval(() => {
        if (window.db && window.salesDb) {
          clearInterval(checkDB);
          this.setupDataSources();
        }
      }, 500);
      this.$nextTick(() => {
        if (window.lucide) window.lucide.createIcons();
      });
    },

    openModal(type) {
      if (type === 'expiring') this.showExpiringModal = true;
      if (type === 'lowStock') this.showLowStockModal = true;
      this.$nextTick(() => {
        if (window.lucide) window.lucide.createIcons();
      });
    },

    refreshVisuals() {
      if (window.lucide) window.lucide.createIcons();
    },

    setupDataSources() {
      window.salesDb.fetchSalesData((newSales) => {
        this.allSales = newSales || [];
        this.extractEmployees();
        this.applyAllFilters();
        this.isLoading = false;
      });
      this.refreshInventory();
      setInterval(() => this.refreshInventory(), 30000);
    },

    extractEmployees() {
      const emps = new Set();
      this.allSales.forEach((s) => emps.add(s.staff || s.employeeName || 'Standard'));
      this.employeesList = Array.from(emps).sort();
    },

    applyAllFilters() {
      let filtered = this.allSales;
      if (this.selectedEmployee !== 'All') {
        filtered = filtered.filter((s) => (s.staff || s.employeeName || 'Standard') === this.selectedEmployee);
      }

      const refD = new Date(this.referenceDate);
      const fromD = new Date(this.rangeFrom);
      fromD.setHours(0, 0, 0, 0);
      const toD = new Date(this.rangeTo);
      toD.setHours(23, 59, 59, 999);

      if (this.period === 'daily') {
        filtered = filtered.filter((s) => this.parseSaleDate(s).toDateString() === refD.toDateString());
      } else if (this.period === 'range') {
        filtered = filtered.filter((s) => {
          const sd = this.parseSaleDate(s);
          return sd >= fromD && sd <= toD;
        });
      } else if (this.period === 'monthly') {
        filtered = filtered.filter((s) => {
          const sd = this.parseSaleDate(s);
          return sd.getMonth() === refD.getMonth() && sd.getFullYear() === refD.getFullYear();
        });
      }

      this.sales = filtered;
      this.calculateSalesStats();
      this.$nextTick(() => {
        this.updateSalesChart();
        if (window.lucide) window.lucide.createIcons();
      });
    },

    parseSaleDate(s) {
      if (s.createdAt?.seconds) return new Date(s.createdAt.seconds * 1000);
      if (s.createdAt?.toDate) return s.createdAt.toDate();
      return new Date(s.createdAt || Date.now());
    },

    setPeriod(p) {
      this.period = p;
      this.applyAllFilters();
    },

    async refreshInventory() {
      if (!window.db) return;
      this.inventory = (await window.db.fetchInventory()) || [];
      this.calculateInventoryStats();
    },

    calculateInventoryStats() {
      const today = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(today.getDate() + 30);
      this.criticalItems = this.inventory.filter((item) => {
        const exp = new Date(item.expiryDate);
        return exp <= thirtyDays && exp >= today;
      });
      this.lowStockItems = this.inventory.filter((item) => (parseInt(item.quantity) || 0) < 10);
      this.stats.expiringCount = this.criticalItems.length;
      this.stats.lowStockCount = this.lowStockItems.length;
    },

    calculateSalesStats() {
      this.stats.grossSales = this.sales.reduce((sum, s) => {
        const amt = s.totalAmount || (typeof s.total === 'string' ? parseFloat(s.total.replace('₱', '').replace(',', '')) : parseFloat(s.total)) || 0;
        return sum + amt;
      }, 0);
      
      this.stats.netSales = this.sales.reduce((sum, s) => {
        const amt = s.totalAmount || (typeof s.total === 'string' ? parseFloat(s.total.replace('₱', '').replace(',', '')) : parseFloat(s.total)) || 0;
        return sum + (amt - (parseFloat(s.discountApplied) || 0));
      }, 0);

      this.stats.grossProfit = this.sales.reduce((sum, s) => {
        let margin = 0;
        if (Array.isArray(s.items)) {
          s.items.forEach(i => {
            const price = i.price || (typeof i.sellingPrice === 'string' ? parseFloat(i.sellingPrice.replace('₱', '').replace(',', '')) : parseFloat(i.sellingPrice)) || 0;
            const cost = i.costPrice || (typeof i.buyingPrice === 'string' ? parseFloat(i.buyingPrice.replace('₱', '').replace(',', '')) : parseFloat(i.buyingPrice)) || (price * 0.7);
            margin += (price - cost) * (i.quantityPurchased || i.quantity || 1);
          });
        } else {
          // Fallback if no items array
          const total = s.totalAmount || (typeof s.total === 'string' ? parseFloat(s.total.replace('₱', '').replace(',', '')) : 0);
          margin = total * 0.3;
        }
        return sum + margin;
      }, 0);

      const productCounts = {};
      this.sales.forEach((s) => {
        if (Array.isArray(s.items)) {
          s.items.forEach(i => {
            productCounts[i.name] = (productCounts[i.name] || 0) + (i.quantityPurchased || i.quantity || 1);
          });
        }
      });
      let topItem = 'No data';
      let topQty = 0;
      for (const [name, qty] of Object.entries(productCounts)) {
        if (qty > topQty) {
          topQty = qty;
          topItem = name;
        }
      }
      this.stats.topMovingProduct = topItem;
      this.stats.topMovingQty = topQty;
    },

    updateSalesChart() {
      const canvas = document.getElementById('grossSalesChart');
      if (!canvas || !window.Chart) return;

      let labels = [];
      let data = [];
      const refDate = new Date(this.referenceDate);

      if (this.period === 'daily') {
        labels = [...Array(7)].map((_, i) => {
          const d = new Date(refDate);
          d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        data = labels.map((label) =>
          this.allSales
            .filter((s) => {
              if (this.selectedEmployee !== 'All' && (s.staff || s.employeeName) !== this.selectedEmployee) return false;
              return this.parseSaleDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === label;
            })
            .reduce((sum, s) => {
               const amt = s.totalAmount || (typeof s.total === 'string' ? parseFloat(s.total.replace('₱', '').replace(',', '')) : parseFloat(s.total)) || 0;
               return sum + amt;
            }, 0)
        );
      } else {
        labels = ['Total'];
        data = [this.stats.grossSales];
      }

      if (this.charts.sales) {
        this.charts.sales.data.labels = labels;
        this.charts.sales.data.datasets[0].data = data;
        this.charts.sales.update();
      } else {
        this.charts.sales = new Chart(canvas, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              {
                data: data,
                borderColor: '#0d9488',
                backgroundColor: 'rgba(13, 148, 136, 0.05)',
                borderWidth: 5,
                fill: true,
                tension: 0.45,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#0d9488',
                pointBorderWidth: 3,
                pointRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.02)' },
                ticks: {
                  font: { size: 11, weight: '800' },
                  callback: (v) => '₱' + v,
                },
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 11, weight: '800' } },
              },
            },
          },
        });
      }
    },
  };
}

window.dashboardApp = dashboardApp;


