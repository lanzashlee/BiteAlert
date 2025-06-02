// Function to fetch audit trail data from the database
async function fetchAuditTrailData() {
    try {
        const response = await fetch('/api/audit-trail');
        if (!response.ok) {
            throw new Error('Failed to fetch audit trail data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        return [];
    }
}

// DOM Content Loaded Event Handler
document.addEventListener("DOMContentLoaded", async function () {
    try {
        // Show loading state
        const tableBody = document.getElementById('auditTableBody');
        tableBody.innerHTML = '<tr><td colspan="5" class="loading-state">Loading audit trail data...</td></tr>';

        // Fetch initial data
        const auditData = await fetchAuditTrailData();
        
        // Initialize table with fetched data
        populateAuditTable(auditData);

        // Store the data globally for filtering
        window.currentAuditData = auditData;

        // Add event listeners for filters
        document.getElementById('dateFrom').addEventListener('change', filterAuditData);
        document.getElementById('dateTo').addEventListener('change', filterAuditData);
        document.getElementById('filterRole').addEventListener('change', filterAuditData);

        // Setup menu functionality
        setupMenuFunctionality();
    } catch (error) {
        console.error('Error initializing audit trail:', error);
        const tableBody = document.getElementById('auditTableBody');
        tableBody.innerHTML = '<tr><td colspan="5" class="error-state">Error loading audit trail data. Please try again later.</td></tr>';
    }
});

// Table Population Function
function populateAuditTable(data) {
    const tableBody = document.getElementById('auditTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No audit trail records found</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    data.forEach(entry => {
        const row = document.createElement('tr');
        // Determine which ID to show based on role
        let displayId = '';
        if (entry.role === 'admin' && entry.adminID) {
            displayId = entry.adminID;
        } else if (entry.role === 'superadmin' && entry.superAdminID) {
            displayId = entry.superAdminID;
        } else if (entry.patientID) {
            displayId = entry.patientID;
        } else if (entry.staffID) {
            displayId = entry.staffID;
        }

        row.innerHTML = `
           
            <td>${displayId || 'N/A'}</td>
            <td>${entry.role}</td>
            <td>${[entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ')}</td>
            <td>${entry.action}</td>
             <td>${formatDateTime(entry.timestamp)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Filter Function
function filterAuditData() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const role = document.getElementById('filterRole').value;

    let filteredData = [...window.currentAuditData];

    if (dateFrom) {
        filteredData = filteredData.filter(entry => 
            new Date(entry.timestamp) >= new Date(dateFrom)
        );
    }

    if (dateTo) {
        filteredData = filteredData.filter(entry => 
            new Date(entry.timestamp) <= new Date(dateTo)
        );
    }

    if (role) {
        filteredData = filteredData.filter(entry => 
            entry.role.toLowerCase().includes(role.toLowerCase())
        );
    }

    populateAuditTable(filteredData);
}

// Date Formatting Utility
function formatDateTime(date) {
    try {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return new Date(date).toLocaleDateString('en-US', options);
    } catch (error) {
        console.error('Date formatting error:', error);
        return date;
    }
}

// Menu Setup Function
function setupMenuFunctionality() {
    // Menu item click handlers
    document.querySelectorAll(".menu li a").forEach(link => {
        link.addEventListener("click", function () {
            document.querySelector(".menu .active").classList.remove("active");
            this.parentElement.classList.add("active");
        });
    });

    // Menu toggle functionality
    document.querySelector('.menu-toggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (window.innerWidth <= 768 && 
            !sidebar.contains(event.target) && 
            !menuToggle.contains(event.target) && 
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

}

// Sign-out functionality
const signOutBtn = document.getElementById('signOutBtn') || document.querySelector('.sign-out');
const signoutModal = document.getElementById('signoutModal');
const cancelSignout = document.getElementById('cancelSignout');
const confirmSignout = document.getElementById('confirmSignout');

if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        signoutModal.classList.add('active');
    });
}

if (cancelSignout) {
    cancelSignout.addEventListener('click', () => {
        signoutModal.classList.remove('active');
    });
}

if (confirmSignout) {
    confirmSignout.addEventListener('click', async () => {
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
            signoutModal.classList.remove('active');
        }
    });
}

// Close modal when clicking outside overlay
if (signoutModal) {
    signoutModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('signout-modal-overlay')) {
            signoutModal.classList.remove('active');
        }
    });
}