let adminAccounts = [];

// Fetch Admin Accounts
async function fetchAdminAccounts() {
    try {
        // Show loading state
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="loading-state">Loading accounts...</td></tr>';
        
        const response = await fetch('/api/admin-accounts');
        if (!response.ok) {
            throw new Error('Failed to fetch admin accounts');
        }
        adminAccounts = await response.json();
        
        // Check if we have data
        if (adminAccounts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" class="no-data">No admin accounts found</td></tr>';
            return;
        }
        
        populateAccountsTable(adminAccounts);
    } catch (error) {
        console.error('Error:', error);
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="error-state">Failed to load admin accounts</td></tr>';
    }
}

// DOM Content Loaded Event Handler
document.addEventListener('DOMContentLoaded', function() {
    // Fetch and initialize the table
    fetchAdminAccounts();
    
    // Add event listeners
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Setup menu functionality
    setupMenuFunctionality();
    
    // Add focus events for search box animation
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    searchInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// Table Population Function
function populateAccountsTable(accounts) {
    const tableBody = document.getElementById('accountsTableBody');
    tableBody.innerHTML = '';

    accounts.forEach(account => {
        // Convert isActive to boolean to ensure proper comparison
        account.isActive = typeof account.isActive === 'boolean' ? account.isActive : account.isActive === true;
        
        console.log(`Rendering account ${account.username} with isActive=${account.isActive}`);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${account.id}</td>
            <td>
                <div class="user-info">
                    <span class="username">${account.username}</span>
                    <span class="fullname">${account.fullName}</span>
                    <span class="role ${account.role.toLowerCase()}">${account.role}</span>
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    ${account.role.toLowerCase() === 'superadmin' ? 
                        '<span class="status-badge">Always Active</span>' :
                        `<div class="status-container">
                            <span class="status-indicator ${account.isActive ? 'active' : 'inactive'}">
                                ${account.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <button class="btn-activate" onclick="handleActivation('${account.id}', true)" 
                                ${account.isActive ? 'style="display:none;"' : ''}>
                                <i class="fa-solid fa-check-circle"></i> Activate
                        </button>
                        <button class="btn-deactivate" onclick="handleActivation('${account.id}', false)"
                                ${!account.isActive ? 'style="display:none;"' : ''}>
                                <i class="fa-solid fa-ban"></i> Deactivate
                            </button>
                        </div>`
                    }
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Search Function
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase();
    
    if (searchTerm === '') {
        populateAccountsTable(adminAccounts);
        return;
    }
    
    const filteredAccounts = adminAccounts.filter(account => 
        account.username.toLowerCase().includes(searchTerm) ||
        account.fullName.toLowerCase().includes(searchTerm) ||
        account.id.toLowerCase().includes(searchTerm)
    );
    
    populateAccountsTable(filteredAccounts);
    
    // Show message if no results
    if (filteredAccounts.length === 0) {
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.innerHTML = '<tr><td colspan="3" class="no-data">No matching accounts found</td></tr>';
    }
}

// Account Activation Handler
function handleActivation(accountId, activate) {
    const modal = document.getElementById('confirmationModal');
    const confirmButton = document.getElementById('confirmButton');
    const modalMessage = document.getElementById('modalMessage');
    
    modalMessage.textContent = `Are you sure you want to ${activate ? 'activate' : 'deactivate'} this account?`;
    modal.classList.add('active');

    // Remove any existing event listeners
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listener
    newConfirmButton.addEventListener('click', async () => {
        try {
            // Show loading state on button
            newConfirmButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            newConfirmButton.disabled = true;
            
            // Optimize: Update UI immediately for better user experience
            const accountRow = document.querySelector(`tr[data-account-id="${accountId}"]`);
            if (accountRow) {
                const statusIndicator = accountRow.querySelector('.status-indicator');
                const activateBtn = accountRow.querySelector('.btn-activate');
                const deactivateBtn = accountRow.querySelector('.btn-deactivate');
                
                if (statusIndicator) statusIndicator.textContent = activate ? 'Active' : 'Inactive';
                if (statusIndicator) statusIndicator.className = `status-indicator ${activate ? 'active' : 'inactive'}`;
                if (activateBtn) activateBtn.style.display = activate ? 'none' : 'block';
                if (deactivateBtn) deactivateBtn.style.display = activate ? 'block' : 'none';
            }
            
            // Optimize: Run API calls in parallel
            const [updateResponse, auditResponse] = await Promise.all([
                fetch('/api/update-account-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId, isActive: activate })
                }),
                logAuditTrail(accountId, `${activate ? 'Activated' : 'Deactivated'} account`)
            ]);

            if (!updateResponse.ok) {
                throw new Error('Failed to update account status');
            }

            // Show success message immediately
            showToast(`Account successfully ${activate ? 'activated' : 'deactivated'}`, 'success');
            
            // Close modal
            closeModal();
            
            // Optimize: Only refresh if there's an error
            const data = await updateResponse.json();
            if (!data.success) {
                await fetchAdminAccounts(); // Refresh only if needed
            }
            
        } catch (error) {
            console.error('Error updating account status:', error);
            showToast(error.message || 'Error updating account status', 'error');
            // Revert UI changes on error
            await fetchAdminAccounts();
        }
    });
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add appropriate icon
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `
        <i class="fa-solid fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Show with animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// API Functions
async function updateAccountStatus(accountId, isActive) {
    try {
        console.log(`Updating account ${accountId} to isActive=${isActive}`);
        const response = await fetch('/api/update-account-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountId,
                isActive
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Update account status failed:', data);
            throw new Error(data.message || 'Failed to update account status');
        }

        console.log('Update account status successful:', data);
        return data;
    } catch (error) {
        console.error('Error in updateAccountStatus:', error);
        throw error;
    }
}

// Optimize: Improve logAuditTrail function
async function logAuditTrail(accountId, action) {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        // Don't wait for audit trail response
        fetch('/api/audit-trail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser?.id || accountId,
                role: currentUser?.role || 'system',
                fullName: currentUser?.fullName || 'System',
                action,
                timestamp: new Date().toISOString()
            })
        }).catch(error => console.error('Error logging audit trail:', error));
        
        return { success: true }; // Return immediately
    } catch (error) {
        console.error('Error in logAuditTrail:', error);
        return { success: false };
    }
}

// Modal Functions
function closeModal() {
    const modal = document.getElementById('confirmationModal');
    modal.classList.remove('active');
}

// Menu Functionality
function setupMenuFunctionality() {
    // Menu toggle for mobile
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

    // Sign-out functionality
    document.querySelector('.sign-out').addEventListener('click', async () => {
        try {
            // Get current user info from localStorage or session
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (currentUser) {
                // Log the sign-out action
                await logAuditTrail(currentUser.id, 'Signed out');
                
                // Clear user session
                localStorage.removeItem('currentUser');
            }
            
            // Redirect to login page
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error during sign out:', error);
            showToast('Error signing out. Please try again.', 'error');
        }
    });
}