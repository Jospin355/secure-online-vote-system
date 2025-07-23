// Charts JavaScript - Advanced charting functionality
class ChartsManager {
    constructor() {
        this.charts = {};
        this.chartColors = [
            '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
        ];
    }
    
    // Create responsive pie chart
    createPieChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${percentage}% (${value.toLocaleString('fr-FR')})`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000
            }
        };
        
        const config = {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: this.chartColors.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverBorderWidth: 3,
                    hoverBackgroundColor: this.chartColors.map(color => color + 'dd')
                }]
            },
            options: { ...defaultOptions, ...options }
        };
        
        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }
    
    // Create responsive bar chart
    createBarChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR');
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        };
        
        const config = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: this.chartColors.slice(0, data.labels.length),
                    borderColor: this.chartColors.slice(0, data.labels.length),
                    borderWidth: 1,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: { ...defaultOptions, ...options }
        };
        
        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }
    
    // Create line chart for timeline data
    createLineChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Pourcentage (%)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Temps'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                },
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            },
            animation: {
                duration: 1000
            }
        };
        
        const config = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((dataset, index) => ({
                    label: dataset.label,
                    data: dataset.data,
                    borderColor: this.chartColors[index],
                    backgroundColor: this.chartColors[index] + '20',
                    borderWidth: 3,
                    fill: dataset.fill || false,
                    pointBackgroundColor: this.chartColors[index],
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }))
            },
            options: { ...defaultOptions, ...options }
        };
        
        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }
    
    // Create doughnut chart
    createDoughnutChart(canvasId, data, options = {}) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        };
        
        const config = {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: this.chartColors.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: { ...defaultOptions, ...options }
        };
        
        this.charts[canvasId] = new Chart(ctx, config);
        return this.charts[canvasId];
    }
    
    // Update chart data
    updateChartData(chartId, newData) {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        chart.data.labels = newData.labels;
        
        if (chart.config.type === 'line') {
            chart.data.datasets.forEach((dataset, index) => {
                if (newData.datasets[index]) {
                    dataset.data = newData.datasets[index].data;
                }
            });
        } else {
            chart.data.datasets[0].data = newData.values;
        }
        
        chart.update('none');
    }
    
    // Add real-time data point
    addDataPoint(chartId, label, values) {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        chart.data.labels.push(label);
        
        if (chart.config.type === 'line') {
            chart.data.datasets.forEach((dataset, index) => {
                dataset.data.push(values[index] || 0);
            });
        } else {
            chart.data.datasets[0].data = values;
        }
        
        // Keep only last 20 data points for timeline charts
        if (chart.config.type === 'line' && chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }
        
        chart.update('none');
    }
    
    // Animate chart
    animateChart(chartId) {
        const chart = this.charts[chartId];
        if (chart) {
            chart.update('active');
        }
    }
    
    // Destroy chart
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }
    
    // Get chart instance
    getChart(chartId) {
        return this.charts[chartId];
    }
    
    // Convert chart type
    convertChart(chartId, newType) {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        chart.config.type = newType;
        
        // Adjust options based on chart type
        if (newType === 'bar') {
            chart.options.scales = {
                y: { beginAtZero: true },
                x: { display: true }
            };
        } else if (newType === 'pie' || newType === 'doughnut') {
            delete chart.options.scales;
        }
        
        chart.update();
    }
    
    // Export chart as image
    exportChart(chartId, filename = 'chart') {
        const chart = this.charts[chartId];
        if (!chart) return;
        
        const url = chart.toBase64Image();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    // Resize all charts
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            chart.resize();
        });
    }
}

// Global charts manager instance
window.chartsManager = new ChartsManager();

// Handle window resize
window.addEventListener('resize', function() {
    window.chartsManager.resizeCharts();
});

// Export charts functionality
window.ChartsModule = {
    ChartsManager
};
