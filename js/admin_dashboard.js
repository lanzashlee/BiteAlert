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

    // Patients/Users Chart
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

    // Cases by Center Chart
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

    // Function to update cases per barangay data
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

    // Initial load of cases per barangay data
    updateCasesPerBarangay();
    setInterval(updateCasesPerBarangay, 300000);

    // Vaccine Stocks Chart
    let vaccinesChart = null;

    function createOrUpdateVaccinesChart(labels, data) {
        const ctx = document.getElementById("vaccinesChart").getContext("2d");
        if (vaccinesChart) {
            vaccinesChart.data.labels = labels;
            vaccinesChart.data.datasets[0].data = data;
            vaccinesChart.update();
        } else {
            vaccinesChart = new Chart(ctx, {
        type: "line",
        data: {
                    labels: labels,
            datasets: [{
                label: "Available Stocks",
                        data: data,
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
        }
    }

    async function updateVaccineStockTrends() {
        try {
            const response = await fetch('/api/vaccine-stock-trends');
            const result = await response.json();
            if (result.success) {
                createOrUpdateVaccinesChart(result.labels, result.data);
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
            document.querySelector('.dashboard-container').classList.toggle('menu-collapsed');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                    sidebar.classList.remove('active');
                    menuToggle.classList.remove('active');
                    document.querySelector('.dashboard-container').classList.remove('menu-collapsed');
                }
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                menuToggle.classList.remove('active');
                document.querySelector('.dashboard-container').classList.remove('menu-collapsed');
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

    // Initialize Geographical Distribution Chart
    const geographicalCanvas = document.getElementById('geographicalChart');
    let geographicalChart = null;
    if (geographicalCanvas) {
        const geographicalCtx = geographicalCanvas.getContext('2d');
        geographicalChart = new Chart(geographicalCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Number of Rabies Cases',
                    data: [],
                    backgroundColor: 'rgba(128, 0, 0, 0.7)',
                    borderWidth: 0,
                    maxBarThickness: 25,
                    minBarLength: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Rabies Cases Distribution in San Juan City',
                        font: {
                            size: 14,
                            weight: '500'
                        },
                        padding: {
                            bottom: 25
                        }
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'white',
                        titleColor: '#666',
                        bodyColor: '#666',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.raw} cases`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 11
                            },
                            stepSize: 5
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 11
                            }
                        },
                        border: {
                            display: false
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 20,
                        right: 30,
                        top: 20,
                        bottom: 10
                    }
                }
            }
        });
    }

    // Cache for geographical data
    let geographicalDataCache = {
        data: null,
        timestamp: null
    };

    // Function to update geographical data
    function updateGeographicalData() {
        if (!geographicalChart) return;
        const now = Date.now();
        const cacheDuration = 5 * 60 * 1000; // 5 minutes in milliseconds

        // Check if we have valid cached data
        if (geographicalDataCache.data && geographicalDataCache.timestamp && 
            (now - geographicalDataCache.timestamp) < cacheDuration) {
            updateChartWithData(geographicalDataCache.data);
            return;
        }

        // Fetch new data from the API
        $.ajax({
            url: '/api/get-geographical-data',
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                // Update cache
                geographicalDataCache = {
                    data: data,
                    timestamp: now
                };
                
                // Update chart
                updateChartWithData(data);
            },
            error: function(xhr, status, error) {
                console.error('Error fetching geographical data:', error);
                // If we have cached data, use it as fallback
                if (geographicalDataCache.data) {
                    updateChartWithData(geographicalDataCache.data);
                }
            }
        });
    }

    // Function to update chart with data
    function updateChartWithData(data) {
        if (!geographicalChart) return;
        geographicalChart.data.labels = data.locations;
        geographicalChart.data.datasets[0].data = data.cases;
        geographicalChart.update();
    }

    // Initial data load and periodic updates
    updateGeographicalData();
    setInterval(updateGeographicalData, 300000); // Update every 5 minutes

    // WebSocket connection for real-time updates
    let ws = null;

    function connectWebSocket() {
        ws = new WebSocket(`ws://${window.location.host}`);
        
        ws.onopen = function() {
            console.log('WebSocket connection established');
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'newCase') {
                // Invalidate cache and update data
                geographicalDataCache = {
                    data: null,
                    timestamp: null
                };
                updateGeographicalData();
            }
        };
        
        ws.onclose = function() {
            console.log('WebSocket connection closed. Reconnecting...');
            setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    }

    // Initialize WebSocket connection
    connectWebSocket();

    // Fetch and update dashboard card values
    async function updateDashboardCards() {
        const cardIds = ['totalPatientsCard', 'vaccineStocksCard', 'activeCasesCard', 'healthCentersCard'];
        // Show spinners and hide values
        cardIds.forEach(id => {
            const spinner = document.getElementById('spinner-' + id);
            const cardElem = document.getElementById(id);
            const valueText = cardElem ? cardElem.querySelector('.value-text') : null;
            if (spinner) spinner.style.display = '';
            if (valueText) valueText.style.display = 'none';
        });
        // Artificial delay for spinner visibility
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
            // Fetch vaccine stocks separately
            const vaccineResponse = await fetch('/api/vaccinestocks');
            const vaccineResult = await vaccineResponse.json();
            
            if (vaccineResult.success) {
                // Calculate total stock across all centers and vaccines
                const totalStock = vaccineResult.data.reduce((sum, center) => {
                    if (Array.isArray(center.vaccines)) {
                        return sum + center.vaccines.reduce((centerSum, vaccine) => {
                            const quantity = typeof vaccine.stock === 'object' && vaccine.stock.$numberDouble !== undefined 
                                ? parseFloat(vaccine.stock.$numberDouble) 
                                : (typeof vaccine.stock === 'object' && vaccine.stock.$numberInt !== undefined 
                                    ? parseInt(vaccine.stock.$numberInt) 
                                    : vaccine.stock);
                            return centerSum + (typeof quantity === 'number' ? quantity : 0);
                        }, 0);
                    }
                    return sum;
                }, 0);

                // Update vaccine stocks card
                const vaccineStocksCard = document.getElementById('vaccineStocksCard');
                if (vaccineStocksCard) {
                    const valueText = vaccineStocksCard.querySelector('.value-text');
                    if (valueText) {
                        valueText.textContent = totalStock.toLocaleString();
                    }
                }
            }

            // Fetch other dashboard data
            const filterElem = document.getElementById('timeRange');
            const filter = filterElem ? filterElem.value : 'month';
            const response = await fetch(`/api/dashboard-summary?filter=${filter}`);
            const result = await response.json();
            
            if (result.success) {
                const { totalPatients, activeCases, healthCenters } = result.data;
                const totalPatientsCard = document.getElementById('totalPatientsCard');
                const activeCasesCard = document.getElementById('activeCasesCard');
                const healthCentersCard = document.getElementById('healthCentersCard');
                
                if (totalPatientsCard) {
                    const valueText = totalPatientsCard.querySelector('.value-text');
                    if (valueText) valueText.textContent = totalPatients.toLocaleString();
                }
                if (activeCasesCard) {
                    const valueText = activeCasesCard.querySelector('.value-text');
                    if (valueText) valueText.textContent = activeCases.toLocaleString();
                }
                if (healthCentersCard) {
                    const valueText = healthCentersCard.querySelector('.value-text');
                    if (valueText) valueText.textContent = healthCenters.toLocaleString();
                }
            }
        } catch (error) {
            console.error('Error updating dashboard cards:', error);
            // Set default values if there's an error
            cardIds.forEach(id => {
                const cardElem = document.getElementById(id);
                if (cardElem) {
                    const valueText = cardElem.querySelector('.value-text');
                    if (valueText) valueText.textContent = '0';
                }
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

    // Listen for filter changes
    document.getElementById('timeRange').addEventListener('change', function() {
        updateDashboardCards();
        updateCasesPerBarangay();
    });

    // Call once on load and every 5 minutes
    updateDashboardCards();
    setInterval(updateDashboardCards, 300000);

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
});
