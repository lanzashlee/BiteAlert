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
    
     // Menu Toggle Functionality
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

    
    // Sign out functionality
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    } else {
        console.error('Sign out button not found');
    }

    // Visualize prescribed and allocated vaccine stocks per barangay as text prescriptions
    loadVaccineDistribution();

    // Add event listeners for analytics filter and search
    const vaccineFilter = document.getElementById('analyticsVaccineFilter');
    const searchInput = document.getElementById('analyticsSearchInput');
    window._analyticsTableData = null; // Store last analysis for filtering

    // Patch updateBarangayTable to use global data
    const origUpdateBarangayTable = updateBarangayTable;
    updateBarangayTable = function(analysis) {
        window._analyticsTableData = analysis;
        applyAnalyticsFilters();
    };

    function applyAnalyticsFilters() {
        if (!window._analyticsTableData) return;
        const filterValue = vaccineFilter ? vaccineFilter.value : '';
        const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let filtered = window._analyticsTableData.barangayData;
        if (filterValue) {
            filtered = filtered.filter(row => {
                // Match short code or descriptive label
                const types = row.vaccineType.split(',').map(t => t.trim().toLowerCase());
                return types.some(t =>
                    t === filterValue.toLowerCase() ||
                    (filterValue === 'arv' && t.includes('anti-rabies')) ||
                    (filterValue === 'tcv' && t.includes('tetanus')) ||
                    (filterValue === 'erig' && t.includes('equine')) ||
                    (filterValue === 'booster' && t.includes('booster'))
                );
            });
        }
        if (searchValue) {
            filtered = filtered.filter(row =>
                row.barangay.toLowerCase().includes(searchValue) ||
                row.vaccineType.toLowerCase().includes(searchValue)
            );
        }
        // Sort by priority: high, medium, low (case-insensitive)
        filtered = filtered.slice().sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[(a.priority || '').toLowerCase()] - priorityOrder[(b.priority || '').toLowerCase()];
        });
        // Render filtered data
        const tbody = document.getElementById('barangayAnalysisTable');
        if (!tbody) return;
        tbody.innerHTML = '';
        filtered.forEach(data => {
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
    }
    if (vaccineFilter) vaccineFilter.addEventListener('change', applyAnalyticsFilters);
    if (searchInput) searchInput.addEventListener('input', applyAnalyticsFilters);

    // Tooltip for severity cards
    const statCardTooltip = document.getElementById('statCardTooltip');
    let tooltipHideTimer = null;
    function showStatTooltip(card, priority) {
        if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
        // Always use the latest data
        const analysis = window._analyticsTableData || { barangayData: [] };
        const centers = analysis.barangayData
            .filter(row => row.priority === priority)
            .map(row => `${row.barangay} (${row.vaccineType})`);
        let title = '';
        if (priority === 'high') title = 'High Priority Centers';
        else if (priority === 'medium') title = 'Medium Priority Centers';
        else if (priority === 'low') title = 'Low Priority Centers';
        let html = `<div class='tooltip-title'>${title}</div>`;
        if (centers.length === 0) {
            html += `<div class='tooltip-empty'>None</div>`;
        } else {
            html += `<ul class='tooltip-list'>`;
            centers.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul>`;
        }
        statCardTooltip.innerHTML = html;
        statCardTooltip.style.display = 'block';
        // Position below the card, centered
        const rect = card.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        statCardTooltip.style.left = (rect.left + rect.width/2 - statCardTooltip.offsetWidth/2) + 'px';
        statCardTooltip.style.top = (rect.bottom + scrollY + 18) + 'px';
        setTimeout(() => {
            statCardTooltip.classList.add('show-tooltip');
            statCardTooltip.style.left = (rect.left + rect.width/2 - statCardTooltip.offsetWidth/2) + 'px';
            statCardTooltip.style.top = (rect.bottom + scrollY + 18) + 'px';
        }, 10);
    }
    function hideStatTooltip() {
        tooltipHideTimer = setTimeout(() => {
            statCardTooltip.classList.remove('show-tooltip');
            setTimeout(() => {
                statCardTooltip.style.display = 'none';
            }, 220);
        }, 80);
    }
    // Attach listeners for each severity card
    document.querySelector('.severity-card.high')?.addEventListener('mouseenter', function() {
        showStatTooltip(this, 'high');
    });
    document.querySelector('.severity-card.high')?.addEventListener('mouseleave', hideStatTooltip);
    document.querySelector('.severity-card.medium')?.addEventListener('mouseenter', function() {
        showStatTooltip(this, 'medium');
    });
    document.querySelector('.severity-card.medium')?.addEventListener('mouseleave', hideStatTooltip);
    document.querySelector('.severity-card.low')?.addEventListener('mouseenter', function() {
        showStatTooltip(this, 'low');
    });
    document.querySelector('.severity-card.low')?.addEventListener('mouseleave', hideStatTooltip);
    statCardTooltip.addEventListener('mouseenter', function() {
        if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    });
    statCardTooltip.addEventListener('mouseleave', function() {
        tooltipHideTimer = setTimeout(() => {
            statCardTooltip.classList.remove('show-tooltip');
            setTimeout(() => {
                statCardTooltip.style.display = 'none';
            }, 220);
        }, 80);
    });

    // Add Export PDF functionality
    const exportBtn = document.getElementById('exportAnalyticsPDF');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportAnalyticsTablePDF();
        });
    }
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
                        // Sum all stockEntries for this vaccine
                        let quantity = 0;
                        if (Array.isArray(vaccine.stockEntries)) {
                            quantity = vaccine.stockEntries.reduce((sum, entry) => {
                                let val = entry.stock;
                                if (typeof val === 'object' && val.$numberInt !== undefined) val = parseInt(val.$numberInt);
                                else if (typeof val === 'object' && val.$numberDouble !== undefined) val = parseFloat(val.$numberDouble);
                                else val = Number(val);
                                return sum + (isNaN(val) ? 0 : val);
                            }, 0);
                        }
                        inventoryData.push({
                            barangay: center.centerName,
                            name: vaccine.name,
                            type: vaccine.type,
                            brand: vaccine.brand,
                            quantity,
                            status: quantity <= 0 ? 'out' : (quantity <= 10 ? 'low' : 'active')
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
            high: 0,
            medium: 0,
            low: 0
        },
        barangayData: [] // Now an array of rows, not an object
    };

    // Group inventory by barangay
    const inventoryByBarangay = {};
    inventoryData.forEach(inv => {
        if (!inventoryByBarangay[inv.barangay]) inventoryByBarangay[inv.barangay] = [];
        inventoryByBarangay[inv.barangay].push(inv);
    });

    const detailedVaccineArray = [];
    Object.keys(inventoryByBarangay).forEach(barangay => {
        // Normalize barangay name for matching, ignore 'health center' suffix
        const normalizedBarangay = barangay.trim().toLowerCase().replace(/ health center$/, '');
        const barangayCases = casesData.filter(c => {
            if (!c.barangay) return false;
            const caseBarangay = c.barangay.trim().toLowerCase().replace(/ health center$/, '');
            return (
                caseBarangay === normalizedBarangay ||
                caseBarangay.includes(normalizedBarangay) ||
                normalizedBarangay.includes(caseBarangay)
            );
        });
        const totalCases = barangayCases.length;
        const requiredVaccines = 30;
        const vaccines = inventoryByBarangay[barangay];

        let vaccineNeededArr = [];
        let recs = [];
        let priority = 'low';
        let hasCritical = false, hasLow = false;
        const seenVaccineTypes = new Set();
        let vaccineTypeListArr = [];
        let currentStockArr = [];

        vaccines.forEach(vaccine => {
            const vaccineType = vaccine.type || vaccine.name || 'Unknown Vaccine';
            if (seenVaccineTypes.has(vaccineType)) return; // Skip duplicates
            seenVaccineTypes.add(vaccineType);
            vaccineTypeListArr.push(vaccineType);
            const current = vaccine.quantity ?? 0;
            const needed = requiredVaccines - current;
            currentStockArr.push(`${vaccineType}: <span class='stock-number'>${current}</span>`);
            // For transfer plan
            detailedVaccineArray.push({
                barangay,
                vaccineType,
                currentStock: current,
                requiredStock: requiredVaccines
            });
            let status = 'sufficient';
            if (current <= 10) {
                status = 'critical';
                hasCritical = true;
            } else if (current <= 20) {
                status = 'low';
                hasLow = true;
            }
            if (needed > 0) {
                vaccineNeededArr.push(`${vaccineType}: ${current}/${requiredVaccines} (Needs ${needed})`);
            } else {
                vaccineNeededArr.push(`${vaccineType}: ${current}/${requiredVaccines} (Sufficient)`);
            }
            if (needed > 0) {
                if (status === 'critical') {
                    recs.push(`Urgently allocate ${needed} additional dose${needed > 1 ? 's' : ''} of ${vaccineType} to ${barangay} as stock is critically low and projected to run out within the next 10 hours.`);
                } else if (status === 'low') {
                    recs.push(`Allocate ${needed} additional dose${needed > 1 ? 's' : ''} of ${vaccineType} to ${barangay} within the next 24 hours as consumption forecasts indicate depletion within that timeframe.`);
                } else if (current <= 29) {
                    recs.push(`Allocate ${needed} additional dose${needed > 1 ? 's' : ''} of ${vaccineType} to ${barangay} within the next 3 days to prevent projected stockout based on current usage trends.`);
                }
            } else {
                recs.push(`No action required for ${vaccineType}.`);
            }
        });
        if (hasCritical) {
            priority = 'high';
            analysis.severityCounts.high++;
        } else if (hasLow) {
            priority = 'medium';
            analysis.severityCounts.medium++;
        } else {
            analysis.severityCounts.low++;
        }
        let recommendedAction = '';
        if (recs.every(r => r.startsWith('No action'))) {
            recommendedAction = 'No additional allocation is required. All vaccines are sufficiently stocked for this center.';
        } else {
            recommendedAction = recs.join(' ');
        }
            analysis.barangayData.push({
            barangay: barangay,
            totalCases: totalCases,
            vaccineType: vaccineTypeListArr.join(', '),
            currentStock: currentStockArr.join(', '),
            requiredStock: requiredVaccines,
                priority: priority,
            recommendedAction: recommendedAction
        });
    });
    // Call transfer plan with detailed array
    const transferPlan = generateFullTransferPlan(detailedVaccineArray);

    // --- Full Prescriptive Analytics: Generate and display transfer plan ---
    setTimeout(() => {
        const planDiv = document.getElementById('transferPlanList');
        const summaryDiv = document.getElementById('transferPlanSummaryList');
        if (planDiv) {
            if (transferPlan.length === 0) {
                planDiv.innerHTML = `
                    <div class="no-transfers">
                        <i class="fa-solid fa-check-circle"></i>
                        <p>No transfers needed. All centers are sufficiently stocked.</p>
                    </div>
                `;
                if (summaryDiv) summaryDiv.innerHTML = '';
            } else {
                const summaryHtml = transferPlan.map(t => `
                    <div class="transfer-summary-item ${t.priority}">
                        <i class="fa-solid fa-arrow-right-arrow-left summary-icon"></i>
                        <span class="summary-sentence">
                            Send <span class="summary-amount">${Number(t.amount) % 1 === 0 ? Number(t.amount) : Number(t.amount).toFixed(1)}</span> doses of <span class="summary-vaccine">${t.vaccine}</span> from <span class="summary-from">${t.from}</span> to <span class="summary-to">${t.to}</span>.
                        </span>
                    </div>
                `).join('');
                summaryDiv.innerHTML = summaryHtml;
            }
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
    document.querySelector('.severity-card.high .count').textContent = analysis.severityCounts.high;
    document.querySelector('.severity-card.medium .count').textContent = analysis.severityCounts.medium;
    document.querySelector('.severity-card.low .count').textContent = analysis.severityCounts.low;
}

// Update barangay analysis table to support array data
function updateBarangayTable(analysis) {
    const tbody = document.getElementById('barangayAnalysisTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Sort by priority: high, medium, low (case-insensitive)
    let filteredData = analysis.barangayData.slice();
    filteredData.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[(a.priority || '').toLowerCase()] - priorityOrder[(b.priority || '').toLowerCase()];
    });

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
    const signoutModal = document.getElementById('signoutModal');
    if (signoutModal) {
        signoutModal.classList.add('active');
    }
}

// Handle signout confirmation
document.getElementById('confirmSignout')?.addEventListener('click', async () => {
    try {
        let currentUser = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('userData'));
        
        // Always fetch the latest account status to ensure we have the correct ID
        if (currentUser && currentUser.email) {
            try {
                const res = await fetch(`/api/account-status/${encodeURIComponent(currentUser.email)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.account) {
                        currentUser = { ...currentUser, ...data.account };
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch account status for logout:', err);
            }
        }

        if (!currentUser) {
            throw new Error('No active session found');
        }

        // Send logout event to backend for audit trail
        const logoutData = {
            role: currentUser.role,
            firstName: currentUser.firstName,
            middleName: currentUser.middleName || '',
            lastName: currentUser.lastName,
            action: 'Signed out'
        };

        // Always include the ID if it exists, regardless of format
        if (currentUser.role === 'admin' && currentUser.adminID) {
            logoutData.adminID = currentUser.adminID;
        } else if (currentUser.role === 'superadmin' && currentUser.superAdminID) {
            logoutData.superAdminID = currentUser.superAdminID;
        }

        try {
            await fetch('/api/logout', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logoutData)
            });
        } catch (err) {
            console.warn('Logout API call failed:', err);
        }

        // Clear user session
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        
        // Redirect to login page
        window.location.replace('login.html');
    } catch (error) {
        console.error('Error during sign out:', error);
        alert(error.message || 'Error signing out. Please try again.');
    } finally {
        const signoutModal = document.getElementById('signoutModal');
        if (signoutModal) {
            signoutModal.classList.remove('active');
        }
    }
});

// Handle signout cancellation
document.getElementById('cancelSignout')?.addEventListener('click', () => {
    const signoutModal = document.getElementById('signoutModal');
    if (signoutModal) {
        signoutModal.classList.remove('active');
    }
});

// Close modal when clicking outside overlay
document.getElementById('signoutModal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('signout-modal-overlay')) {
        e.target.closest('.signout-modal').classList.remove('active');
    }
});

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
                    amount: transferAmount,
                    priority: needCenter.priority,
                    currentStock: needCenter.currentStock,
                    requiredStock: needCenter.requiredStock
                });
                donor.excess -= transferAmount;
                donor.currentStock -= transferAmount;
                needed -= transferAmount;
                if (needed <= 0) break;
            }
        }
    });

    // Update summary statistics
    const totalTransfers = transfers.length;
    const totalDoses = transfers.reduce((sum, t) => sum + t.amount, 0);
    const centersInvolved = new Set([...transfers.map(t => t.from), ...transfers.map(t => t.to)]).size;

    // Update summary elements
    document.getElementById('totalTransfers').textContent = totalTransfers;
    document.getElementById('totalDoses').textContent = totalDoses;
    document.getElementById('centersInvolved').textContent = centersInvolved;

    // Render the plan in the UI
    const planDiv = document.getElementById('transferPlanList');
    const summaryDiv = document.getElementById('transferPlanSummaryList');
    if (planDiv) {
        if (transfers.length === 0) {
            planDiv.innerHTML = `
                <div class="no-transfers">
                    <i class="fa-solid fa-check-circle"></i>
                    <p>No transfers needed. All centers are sufficiently stocked.</p>
                </div>
            `;
            if (summaryDiv) summaryDiv.innerHTML = '';
        } else {
            const planHtml = transfers.map(t => `
                <div class="transfer-item ${t.priority}">
                    <div class="transfer-icon">
                        <i class="fa-solid fa-truck"></i>
                    </div>
                    <div class="transfer-details">
                        <div class="transfer-header">
                            <span class="transfer-vaccine">${t.vaccine}</span>
                            <span class="transfer-amount">${Number(t.amount) % 1 === 0 ? Number(t.amount) : Number(t.amount).toFixed(1)} doses</span>
                            <span class="priority-badge priority-${t.priority}">${t.priority}</span>
                        </div>
                        <div class="transfer-route">
                            <span class="from">${t.from}</span>
                            <i class="fa-solid fa-arrow-right"></i>
                            <span class="to">${t.to}</span>
                        </div>
                        <div class="transfer-stats">
                            <div class="stat-item">
                                <i class="fa-solid fa-box"></i>
                                <span>Current Stock: ${t.currentStock}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fa-solid fa-chart-line"></i>
                                <span>Required: ${t.requiredStock}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
            planDiv.innerHTML = planHtml;
            // Modern summary/compact list
            if (summaryDiv) {
                const summaryHtml = transfers.map(t => `
                    <div class="transfer-summary-item ${t.priority}">
                        <i class="fa-solid fa-arrow-right-arrow-left summary-icon"></i>
                        <span class="summary-sentence">
                            Send <span class="summary-amount">${Number(t.amount) % 1 === 0 ? Number(t.amount) : Number(t.amount).toFixed(1)}</span> doses of <span class="summary-vaccine">${t.vaccine}</span> from <span class="summary-from">${t.from}</span> to <span class="summary-to">${t.to}</span>.
                        </span>
                    </div>
                `).join('');
                summaryDiv.innerHTML = summaryHtml;
            }
        }
    }

    return transfers;
}

function exportAnalyticsTablePDF() {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) {
        alert('jsPDF library not loaded.');
        return;
    }
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = 'sj.png';
    const img = new window.Image();
    img.crossOrigin = '';
    img.onload = function() {
        const imgWidth = 30;
        const imgHeight = 30;
        const x = (pageWidth - imgWidth) / 2;
        doc.addImage(img, 'PNG', x, 10, imgWidth, imgHeight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Center Case Analysis & Recommendations', pageWidth / 2, 50, { align: 'center' });
        // Table
        const table = document.querySelector('.barangay-analysis-table');
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: 58,
            styles: { font: 'poppins', fontSize: 10 },
            headStyles: { fillColor: [128, 0, 0] },
            margin: { left: 14, right: 14 }
        });
        doc.save(`center_case_analysis_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    img.onerror = function() {
        // Fallback: No logo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Center Case Analysis & Recommendations', pageWidth / 2, 30, { align: 'center' });
        const table = document.querySelector('.barangay-analysis-table');
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
        );
        doc.autoTable({
            head: [headers],
            body: rows,
            startY: 38,
            styles: { font: 'poppins', fontSize: 10 },
            headStyles: { fillColor: [128, 0, 0] },
            margin: { left: 14, right: 14 }
        });
        doc.save(`center_case_analysis_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    img.src = logoUrl;
}