// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const signOutBtn = document.getElementById('signOutBtn');
const mainContent = document.querySelector('.main-content');


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Load initial data
    loadAnalyticsData(30); // Load last 30 days of data
    
    // Menu toggle functionality
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.dashboard-container').classList.toggle('menu-collapsed');
        });
    }
    
    // Sign out functionality
    if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
    } else {
        console.error('Sign out button not found');
    }

    // Visualize prescribed and allocated vaccine stocks per barangay as text prescriptions
    loadVaccineDistribution();
});

// Show/Hide Loading Overlay
function showLoading() {
    console.log('Showing loading overlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
    loadingOverlay.classList.add('active');
    } else {
        console.error('Loading overlay element not found');
    }
}

function hideLoading() {
    console.log('Hiding loading overlay');
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
    } else {
        console.error('Loading overlay element not found');
    }
}

// Risk Assessment Algorithm
function calculateRiskScore(data) {
    const weights = {
        caseDensity: 0.3,
        vaccinationCoverage: 0.25,
        strayPopulation: 0.2,
        responseTime: 0.15,
        historicalTrend: 0.1
    };

    return data.map(area => {
        const score = (
            (area.caseDensity * weights.caseDensity) +
            ((100 - area.vaccinationCoverage) * weights.vaccinationCoverage) +
            (area.strayPopulation * weights.strayPopulation) +
            (area.responseTime * weights.responseTime) +
            (area.historicalTrend * weights.historicalTrend)
        );

        return {
            ...area,
            riskScore: Math.min(Math.round(score), 100)
        };
    });
}

// Load analytics data
async function loadAnalyticsData(days) {
    showLoading();
    try {
        // Fetch bite cases data from bitecases collection
        const casesResponse = await fetch('/api/bitecases');
        if (!casesResponse.ok) throw new Error(`HTTP error! status: ${casesResponse.status}`);
        const casesData = await casesResponse.json();
        console.log('Fetched bite cases data:', casesData);

        // Fetch vaccine stock data from vaccinestocks collection
        const inventoryResponse = await fetch('/api/vaccinestocks');
        if (!inventoryResponse.ok) throw new Error(`HTTP error! status: ${inventoryResponse.status}`);
        const vaccinestocksData = await inventoryResponse.json();
        // Flatten vaccines for analysis
        let inventoryData = [];
        if (vaccinestocksData.success && Array.isArray(vaccinestocksData.data)) {
            vaccinestocksData.data.forEach(center => {
                if (Array.isArray(center.vaccines)) {
                    center.vaccines.forEach(vaccine => {
                        inventoryData.push({
                            barangay: center.centerName,
                            name: vaccine.name,
                            type: vaccine.type,
                            brand: vaccine.brand,
                            quantity: typeof vaccine.stock === 'object' && vaccine.stock.$numberDouble !== undefined ? parseFloat(vaccine.stock.$numberDouble) : (typeof vaccine.stock === 'object' && vaccine.stock.$numberInt !== undefined ? parseInt(vaccine.stock.$numberInt) : vaccine.stock),
                            status: (typeof vaccine.stock === 'object' && vaccine.stock.$numberDouble !== undefined ? parseFloat(vaccine.stock.$numberDouble) : (typeof vaccine.stock === 'object' && vaccine.stock.$numberInt !== undefined ? parseInt(vaccine.stock.$numberInt) : vaccine.stock)) <= 0 ? 'out' : ((typeof vaccine.stock === 'object' && vaccine.stock.$numberDouble !== undefined ? parseFloat(vaccine.stock.$numberDouble) : (typeof vaccine.stock === 'object' && vaccine.stock.$numberInt !== undefined ? parseInt(vaccine.stock.$numberInt) : vaccine.stock)) <= 10 ? 'low' : 'active')
                        });
                    });
                }
            });
        }
        console.log('Fetched inventory data:', inventoryData);

        // Analyze by barangay
        const analysis = analyzeData(casesData, inventoryData);
        console.log('Analysis result:', analysis);
        updateSeverityCards(analysis);
        updateBarangayTable(analysis);
    } catch (error) {
        showError(`Failed to load analytics data: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Analyze data by barangay
function analyzeData(casesData, inventoryData) {
    console.log('Bite cases data structure:', casesData); // Debug log for bitecases data
    const analysis = {
        severityCounts: {
            emergency: 0,
            high: 0,
            medium: 0
        },
        barangayData: [] // Now an array of rows, not an object
    };

    // Group inventory by barangay
    const inventoryByBarangay = {};
    inventoryData.forEach(inv => {
        if (!inventoryByBarangay[inv.barangay]) inventoryByBarangay[inv.barangay] = [];
        inventoryByBarangay[inv.barangay].push(inv);
    });

    Object.keys(inventoryByBarangay).forEach(barangay => {
        const barangayCases = casesData.filter(c => c.barangay === barangay);
        const severeCases = barangayCases.filter(c => c.severity && (c.severity.toLowerCase() === 'severe' || c.severity.toLowerCase() === 'high')).length;
        const moderateCases = barangayCases.filter(c => c.severity && (c.severity.toLowerCase() === 'moderate' || c.severity.toLowerCase() === 'medium')).length;
        const mildCases = barangayCases.filter(c => c.severity && (c.severity.toLowerCase() === 'mild' || c.severity.toLowerCase() === 'low')).length;
        const totalCases = barangayCases.length;

        // Determine trend (simple: compare last 7 days to previous 7 days)
        const now = new Date();
        const last7 = barangayCases.filter(c => c.incidentDate && (new Date(c.incidentDate) > new Date(now.getTime() - 7*24*60*60*1000))).length;
        const prev7 = barangayCases.filter(c => c.incidentDate && (new Date(c.incidentDate) > new Date(now.getTime() - 14*24*60*60*1000)) && (new Date(c.incidentDate) <= new Date(now.getTime() - 7*24*60*60*1000))).length;
        let caseTrend = null;
        if (last7 > prev7) caseTrend = 'increasing';
        else if (last7 < prev7) caseTrend = 'decreasing';
        else caseTrend = 'stable';

        // Dynamic required calculation
        let baseRequired = (severeCases * 3) + (moderateCases * 2) + (mildCases * 1);
        if (caseTrend === 'increasing') {
            baseRequired = Math.ceil(baseRequired * 1.3);
        } else if (caseTrend === 'stable') {
            baseRequired = Math.ceil(baseRequired * 1.1);
        }
        // If there are no cases, required is 0; otherwise, at least 30
        const requiredVaccines = totalCases > 0 ? Math.max(baseRequired, 30) : 0;

        inventoryByBarangay[barangay].forEach(vaccine => {
        // Determine priority level
            const currentStock = vaccine.quantity ?? 0;
        let priority = 'low';
        if (currentStock <= 10) {
            priority = 'emergency';
            analysis.severityCounts.emergency++;
        } else if (currentStock <= 20) {
            priority = 'high';
            analysis.severityCounts.high++;
        } else if (currentStock <= 29) {
            priority = 'medium';
            analysis.severityCounts.medium++;
        }
            analysis.barangayData.push({
            barangay: barangay,
            totalCases: totalCases,
                vaccineType: vaccine.name,
            currentStock: currentStock,
            requiredStock: requiredVaccines,
                priority: priority,
                recommendedAction: generateRecommendation(
                    { severeCases, moderateCases, mildCases },
                    requiredVaccines,
                    currentStock,
                    {
                        barangay,
                        vaccineType: vaccine.name,
                        severeCases,
                        moderateCases,
                        mildCases,
                        caseTrend
                    }
                )
            });
        });
    });

    // --- Full Prescriptive Analytics: Generate and display transfer plan ---
    const transferPlan = generateFullTransferPlan(analysis.barangayData);
    // Render the plan in the UI (if #transferPlanList exists)
    setTimeout(() => {
        const planDiv = document.getElementById('transferPlanList');
        if (planDiv) {
            const planHtml = transferPlan.length
                ? transferPlan.map(t =>
                    `<li>Transfer <strong>${t.amount}</strong> doses of <strong>${t.vaccine}</strong> from <strong>${t.from}</strong> to <strong>${t.to}</strong></li>`
                  ).join('')
                : '<li>No transfers needed. All centers are sufficiently stocked.</li>';
            planDiv.innerHTML = `<ul>${planHtml}</ul>`;
        }
    }, 0);

    return analysis;
}

// Generate recommendation based on data
function generateRecommendation(data, required, current, options = {}) {
    const {
        barangay = '',
        vaccineType = 'the required vaccine',
        recentCases = 0,
        severeCases = 0,
        moderateCases = 0,
        mildCases = 0,
        caseTrend = null // e.g., 'increasing', 'stable', 'decreasing'
    } = options;

    // Compose a trend message
    let trendMsg = '';
    if (caseTrend === 'increasing') {
        trendMsg = 'Recent data indicates an upward trend in cases. ';
    } else if (caseTrend === 'decreasing') {
        trendMsg = 'Recent data shows a decrease in cases. ';
    } else if (caseTrend === 'stable') {
        trendMsg = 'Case numbers have remained stable recently. ';
    }

    // Compose a severity message
    let severityMsg = '';
    if (severeCases > 0) {
        severityMsg = `There are currently <strong>${severeCases}</strong> severe case(s) reported in this area. `;
    } else if (moderateCases > 0) {
        severityMsg = `There are currently <strong>${moderateCases}</strong> moderate case(s) reported. `;
    } else if (mildCases > 0) {
        severityMsg = `There are currently <strong>${mildCases}</strong> mild case(s) reported. `;
    }

    // Emergency
    if (current <= 10) {
        return `${trendMsg}${severityMsg}Immediate action is required: Allocate <strong>${required}</strong> doses of <strong>${vaccineType}</strong> to <strong>${barangay}</strong> as the current stock is critically low (current stock: ${current}). Please prioritize this center to ensure uninterrupted patient care.`;
    }
    // High
    if (current <= 20) {
        return `${trendMsg}${severityMsg}Timely allocation is recommended: Allocate <strong>${required}</strong> doses of <strong>${vaccineType}</strong> to <strong>${barangay}</strong> within the next 24 hours due to low stock levels (current stock: ${current}). Early intervention will help maintain adequate supply.`;
    }
    // Medium
    if (current <= 29) {
        return `${trendMsg}${severityMsg}Advance planning is advised: Please schedule the allocation of <strong>${required}</strong> doses of <strong>${vaccineType}</strong> to <strong>${barangay}</strong> in the near future. Stock levels are moderate (current stock: ${current}). Continue to monitor case trends and adjust allocations as needed.`;
    }
    // Low
    if (current >= 30) {
        return `${trendMsg}${severityMsg}No immediate action is required. The stock of <strong>${vaccineType}</strong> at <strong>${barangay}</strong> is sufficient (current stock: ${current}). Maintain regular monitoring and be prepared to respond if case numbers change.`;
    }
    // Fallback
    return `${trendMsg}${severityMsg}Continue to monitor the stock and case trends for <strong>${vaccineType}</strong> at <strong>${barangay}</strong>.`;
}

// Update severity cards
function updateSeverityCards(analysis) {
    document.querySelector('.severity-card.emergency .count').textContent = analysis.severityCounts.emergency;
    document.querySelector('.severity-card.high .count').textContent = analysis.severityCounts.high;
    document.querySelector('.severity-card.medium .count').textContent = analysis.severityCounts.medium;
}

// Update barangay analysis table to support array data
function updateBarangayTable(analysis) {
    console.log('Updating barangay table with data:', analysis.barangayData);
    const tbody = document.getElementById('barangayAnalysisTable');
    if (!tbody) {
        console.error('Barangay analysis table body not found');
        return;
    }
    tbody.innerHTML = '';

    // --- Search and Filter ---
    const searchInput = document.getElementById('analyticsSearchInput');
    const vaccineFilter = document.getElementById('analyticsVaccineFilter');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const vaccineType = vaccineFilter ? vaccineFilter.value : '';

    let filteredData = analysis.barangayData;
    if (searchTerm) {
        filteredData = filteredData.filter(data =>
            data.barangay.toLowerCase().includes(searchTerm) ||
            (data.vaccineType && data.vaccineType.toLowerCase().includes(searchTerm))
        );
    }
    if (vaccineType) {
        filteredData = filteredData.filter(data => data.vaccineType === vaccineType);
    }

    if (!filteredData || filteredData.length === 0) {
        console.log('No barangay data to display');
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="text-center">No data available</td>';
        tbody.appendChild(row);
        return;
    }

    filteredData.forEach(data => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.barangay}</td>
            <td>${data.totalCases}</td>
            <td>${data.vaccineType}</td>
            <td>${data.currentStock}</td>
            <td>${data.requiredStock}</td>
            <td><span class="priority-badge priority-${data.priority}">${data.priority}</span></td>
            <td>${data.recommendedAction}</td>
        `;
        tbody.appendChild(row);
    });

    // Add event listeners for search/filter (only once)
    if (!updateBarangayTable._listenersAdded) {
        if (searchInput) searchInput.addEventListener('input', () => updateBarangayTable(analysis));
        if (vaccineFilter) vaccineFilter.addEventListener('change', () => updateBarangayTable(analysis));
        updateBarangayTable._listenersAdded = true;
    }
}

// Filter vaccinations
function filterVaccinations() {
    const areaFilter = document.getElementById('areaFilter').value;
    const riskFilter = document.getElementById('riskFilter').value;
    
    const cards = document.querySelectorAll('.vaccination-card');
    cards.forEach(card => {
        const area = card.querySelector('.patient-info p').textContent.split(': ')[1];
        const risk = card.querySelector('.risk-badge').textContent.toLowerCase();
        
        const areaMatch = areaFilter === 'all' || area === areaFilter;
        const riskMatch = riskFilter === 'all' || risk === riskFilter;
        
        card.style.display = areaMatch && riskMatch ? 'flex' : 'none';
    });
}

// View patient details
function viewPatientDetails(patientId) {
    // Implement patient details view
    console.log('View details for patient:', patientId);
}

// Error Handling
function showError(message) {
    console.error('Error:', message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fa-solid fa-exclamation-circle"></i> ${message}
        </div>
    `;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        // Remove any existing error messages
        const existingErrors = mainContent.querySelectorAll('.error-message');
        existingErrors.forEach(error => error.remove());
        
        // Add new error message at the top
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
        
        // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
    } else {
        console.error('Main content element not found');
    }
}

// Sign Out Handler
async function handleSignOut() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                role: user.role,
                fullName: user.fullName
            })
        });
        
        if (response.ok) {
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Error during sign out:', error);
        showError('Failed to sign out. Please try again.');
    }
}

// Calculate vaccine allocation from patient data
function calculateVaccineAllocationFromPatients(analysis) {
    const allocation = {
        recommendations: []
    };

    // Process each barangay
    Object.entries(analysis.casesByBarangay).forEach(([barangay, totalCases]) => {
        // Calculate risk score based on:
        // 1. Total cases (30%)
        // 2. Recent cases (40%)
        // 3. Severity distribution (30%)
        const recentCases = analysis.recentCases?.[barangay] || 0;
        const severityDistribution = analysis.casesBySeverity || { low: 0, medium: 0, high: 0 };
        
        const riskScore = Math.min(100, Math.round(
            (totalCases * 0.3) + // Total cases weight
            (recentCases * 0.4) + // Recent cases weight
            ((severityDistribution.high * 3 + severityDistribution.medium * 2 + severityDistribution.low) * 0.3) // Severity weight
        ));

        // Calculate recommended vaccine quantity
        // Base: 2 vaccines per case
        // Additional: 1 vaccine per high-risk case
        // Buffer: 20% for unexpected cases
        const baseAllocation = totalCases * 2;
        const highRiskBuffer = severityDistribution.high;
        const unexpectedBuffer = Math.ceil(baseAllocation * 0.2);
        const recommendedQuantity = Math.max(50, baseAllocation + highRiskBuffer + unexpectedBuffer);

        // Determine priority level
        let priority = 'Low';
        if (riskScore >= 70) priority = 'High';
        else if (riskScore >= 40) priority = 'Medium';

        // Add to recommendations
        allocation.recommendations.push({
            barangay,
            recommendedQuantity,
            priorityRank: priority === 'High' ? 1 : priority === 'Medium' ? 2 : 3,
            expectedCoveragePeriod: '30 days',
            confidenceScore: riskScore / 100,
            alertFlags: [
                recentCases > totalCases * 0.3 ? 'Recent spike in cases' : null,
                severityDistribution.high > 0 ? 'High risk cases present' : null
            ].filter(Boolean)
        });
    });

    // Sort recommendations by priority and risk score
    allocation.recommendations.sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
        }
        return b.confidenceScore - a.confidenceScore;
    });

    return allocation;
}

// Visualize prescribed and allocated vaccine stocks per barangay as text prescriptions
async function loadVaccineDistribution() {
    try {
        const response = await fetch('/api/prescribe-vaccine-distribution');
        const result = await response.json();
        const container = document.getElementById('vaccineDistributionTable');
        if (!container) {
            console.error('Prescription container element not found');
            return;
        }
        let html = '<div class="prescription-list">';
        if (!result.prescriptions || !Array.isArray(result.prescriptions) || result.prescriptions.length === 0) {
            html += '<div class="alert alert-info">No prescription needed. No cases found.</div>';
        } else {
            result.prescriptions.forEach(p => {
                html += `<div class="prescription prescription-barangay">
                    <i class='fa-solid fa-syringe'></i>
                    <strong>${p.barangay}</strong>: Allocate <strong>${p.recommended}</strong> doses of <strong>${p.vaccineType}</strong><br>
                    <span style='font-size:0.95em;'>
                        Cases: <strong>${p.totalCases}</strong> &nbsp;|&nbsp; 
                        Severe: <strong>${p.severeCases}</strong>, Moderate: <strong>${p.moderateCases}</strong>, Mild: <strong>${p.mildCases}</strong><br>
                        Available stock: <strong>${p.available}</strong>
                        ${p.note ? `<span style='color:#dc3545;font-weight:600;'> (${p.note})</span>` : ''}
                    </span>
                </div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        const container = document.getElementById('vaccineDistributionTable');
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error loading prescription data: ${error.message}</div>`;
        }
        console.error(error);
    }
}

// --- Full Prescriptive Analytics: Greedy Transfer Plan ---
function generateFullTransferPlan(allCenters) {
    // Build arrays of needy and donor centers
    const needy = [];
    const donors = [];
    Object.values(allCenters).forEach(center => {
        const shortage = center.requiredStock - center.currentStock;
        const excess = center.currentStock - center.requiredStock;
        if (shortage > 0) {
            needy.push({ ...center, shortage });
        } else if (excess > 0) {
            donors.push({ ...center, excess });
        }
    });
    // Sort needy by highest shortage, donors by highest excess
    needy.sort((a, b) => b.shortage - a.shortage);
    donors.sort((a, b) => b.excess - a.excess);
    const transfers = [];
    needy.forEach(needCenter => {
        let needed = needCenter.shortage;
        for (let donor of donors) {
            if (donor.excess <= 0 || donor.vaccineType !== needCenter.vaccineType) continue;
            const transferAmount = Math.min(needed, donor.excess, 10); // max 10 per transfer
            if (transferAmount > 0) {
                transfers.push({
                    from: donor.barangay,
                    to: needCenter.barangay,
                    vaccine: needCenter.vaccineType,
                    amount: transferAmount
                });
                donor.excess -= transferAmount;
                donor.currentStock -= transferAmount;
                needed -= transferAmount;
                if (needed <= 0) break;
            }
        }
    });
    return transfers;
}