document.addEventListener("DOMContentLoaded", function () {
    // Common chart configuration
    Chart.defaults.font.family = "'Segoe UI', Arial, sans-serif";
    Chart.defaults.color = '#2c3e50';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#2c3e50';
    Chart.defaults.plugins.tooltip.bodyColor = '#2c3e50';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 0, 0, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.boxPadding = 6;

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 2000,
            easing: 'easeInOutQuart'
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: {
                        size: 12
                    }
                }
            }
        }
    };

    

    // --- PATIENT GROWTH CHART ---
    const patientsChart = new Chart(document.getElementById("patientsChart"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Patients",
                data: [],
                backgroundColor: "rgba(128, 0, 0, 0.1)",
                borderColor: "#800000",
                borderWidth: 2,
                pointBackgroundColor: "#800000",
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: "#800000",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        padding: 10,
                        callback: function(value) {
                            return value + ' patients';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        padding: 10
                    }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Patient Growth Over Time',
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    font: {
                        size: 16,
                        weight: '500'
                    }
                }
            }
        }
    });
    async function updatePatientGrowth() {
        try {
            const response = await fetch('/api/patient-growth');
            const result = await response.json();
            if (result.success) {
                patientsChart.data.labels = result.labels;
                patientsChart.data.datasets[0].data = result.data;
                patientsChart.update();
            }
        } catch (error) {
            console.error('Error updating patient growth:', error);
        }
    }
    updatePatientGrowth();
    setInterval(updatePatientGrowth, 300000);

    // --- AGE DISTRIBUTION/CASES PER BARANGAY CHART ---
    const casesChart = new Chart(document.getElementById("casesChart"), {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Cases",
                data: [],
                backgroundColor: 'rgba(128, 0, 0, 0.7)',
                borderColor: 'rgba(128, 0, 0, 1)',
                borderWidth: 2,
                borderRadius: 8,
                maxBarThickness: 50
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        padding: 10,
                        callback: function(value) {
                            return value + ' cases';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        padding: 10
                    }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Cases per Barangay',
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    font: {
                        size: 16,
                        weight: '500'
                    }
                }
            }
        }
    });
    async function updateCasesPerBarangay() {
        try {
            const response = await fetch('/api/cases-per-barangay');
            const result = await response.json();
            if (result.success) {
                const barangayNames = result.data.map(item => item.barangay);
                const casesData = result.data.map(item => item.count);
                casesChart.data.labels = barangayNames;
                casesChart.data.datasets[0].data = casesData;
                casesChart.update();
            } else {
                console.error('Failed to load cases per barangay:', result.message);
            }
        } catch (error) {
            console.error('Error loading cases per barangay:', error);
        }
    }
    updateCasesPerBarangay();
    setInterval(updateCasesPerBarangay, 300000);

    // --- VACCINE STOCK TRENDS CHART ---
    const vaccinesChart = new Chart(document.getElementById("vaccinesChart"), {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Available Stocks",
                data: [],
                borderColor: "#800000",
                backgroundColor: "rgba(128, 0, 0, 0.1)",
                borderWidth: 2,
                pointBackgroundColor: "#800000",
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: "#800000",
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        padding: 10,
                        callback: function(value) {
                            return value + ' units';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        padding: 10
                    }
                }
            },
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Vaccine Stock Levels',
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    font: {
                        size: 16,
                        weight: '500'
                    }
                }
            }
        }
    });
    async function updateVaccineStockTrends() {
        try {
            const response = await fetch('/api/vaccine-stock-trends');
            const result = await response.json();
            if (result.success) {
                vaccinesChart.data.labels = result.labels;
                vaccinesChart.data.datasets[0].data = result.data;
                vaccinesChart.update();
            }
        } catch (error) {
            console.error('Error updating vaccine stock trends:', error);
        }
    }
    updateVaccineStockTrends();
    setInterval(updateVaccineStockTrends, 300000);

    // --- SEVERITY CATEGORY CHART ---
    const severityChart = new Chart(document.getElementById("severityChart"), {
        type: "doughnut",
        data: {
            labels: ["Mild", "Moderate", "Severe"],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(46, 213, 115, 0.8)',
                    'rgba(255, 171, 67, 0.8)',
                    'rgba(255, 71, 87, 0.8)'
                ],
                borderColor: [
                    'rgba(46, 213, 115, 1)',
                    'rgba(255, 171, 67, 1)',
                    'rgba(255, 71, 87, 1)'
                ],
                borderWidth: 2,
                borderRadius: 5,
                spacing: 5,
                hoverOffset: 15
            }]
        },
        options: {
            ...commonOptions,
            cutout: '70%',
            plugins: {
                ...commonOptions.plugins,
                title: {
                    display: true,
                    text: 'Case Severity Distribution',
                    padding: {
                        top: 10,
                        bottom: 30
                    },
                    font: {
                        size: 16,
                        weight: '500'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${value} cases (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: '#333',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: function(value, context) {
                        return value > 0 ? value : '';
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
    async function updateSeverityChart() {
        try {
            const response = await fetch('/api/severity-distribution');
            const result = await response.json();
            if (result.success) {
                const { Mild, Moderate, Severe } = result.data;
                const total = Mild + Moderate + Severe;
                if (total === 0) {
                    severityChart.data.datasets[0].data = [1, 0, 0];
                    severityChart.data.labels = ["No Data", "", ""];
                    severityChart.options.plugins.title.text = 'Case Severity Distribution (No Data)';
                } else {
                    severityChart.data.datasets[0].data = [Mild, Moderate, Severe];
                    severityChart.data.labels = ["Mild", "Moderate", "Severe"];
                    severityChart.options.plugins.title.text = 'Case Severity Distribution';
                }
                severityChart.update();
            }
        } catch (error) {
            console.error('Error updating severity chart:', error);
        }
    }
    updateSeverityChart();
    setInterval(updateSeverityChart, 300000);

    // Menu Toggle Functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                    menuToggle.classList.remove('active');
                }
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }

    // Sign-out functionality
    document.querySelector('.sign-out')?.addEventListener('click', async () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (currentUser) {
                // Clear user session
                localStorage.removeItem('currentUser');
            }
            
            // Redirect to login page
            window.location.replace('login.html');
        } catch (error) {
            console.error('Error during sign out:', error);
            alert('Error signing out. Please try again.');
        }
    });


    // --- DASHBOARD SUMMARY CARDS ---
    async function updateDashboardSummary() {
        const cardIds = ['totalPatients', 'vaccineStocks', 'activeCases', 'healthCenters', 'adminCount', 'staffCount'];
        // Show spinners and hide values
        cardIds.forEach(id => {
            const spinner = document.getElementById('spinner-' + id);
            const cardElem = document.getElementById(id);
            const valueText = cardElem ? cardElem.querySelector('.value-text') : null;
            if (spinner) spinner.style.display = '';
            if (valueText) valueText.style.display = 'none';
        });

        try {
            const response = await fetch('/api/dashboard-summary');
            const result = await response.json();
            
            if (result.success && result.data) {
                const mapping = {
                    totalPatients: result.data.totalPatients || 0,
                    vaccineStocks: result.data.vaccineStocks || 0,
                    activeCases: result.data.activeCases || 0,
                    healthCenters: result.data.healthCenters || 0,
                    adminCount: result.data.adminCount || 0,
                    staffCount: result.data.staffCount || 0
                };

                Object.entries(mapping).forEach(([id, value]) => {
                    const cardElem = document.getElementById(id);
                    if (!cardElem) return;
                    const valueText = cardElem.querySelector('.value-text');
                    if (valueText) {
                        // Format numbers with commas for better readability
                        valueText.textContent = value.toLocaleString();
                    }
                });
            } else {
                console.error('Failed to fetch dashboard summary:', result.message);
                // Set default values if fetch fails
                cardIds.forEach(id => {
                    const cardElem = document.getElementById(id);
                    if (!cardElem) return;
                    const valueText = cardElem.querySelector('.value-text');
                    if (valueText) valueText.textContent = '0';
                });
            }
        } catch (error) {
            console.error('Error updating dashboard summary:', error);
            // Set default values if there's an error
            cardIds.forEach(id => {
                const cardElem = document.getElementById(id);
                if (!cardElem) return;
                const valueText = cardElem.querySelector('.value-text');
                if (valueText) valueText.textContent = '0';
            });
        } finally {
            // Hide spinners and show values
            cardIds.forEach(id => {
                const spinner = document.getElementById('spinner-' + id);
                const cardElem = document.getElementById(id);
                const valueText = cardElem ? cardElem.querySelector('.value-text') : null;
                if (spinner) spinner.style.display = 'none';
                if (valueText) valueText.style.display = '';
            });
        }
    }

    // Call updateDashboardSummary when the page loads and set interval
    updateDashboardSummary();
    setInterval(updateDashboardSummary, 300000);
});


