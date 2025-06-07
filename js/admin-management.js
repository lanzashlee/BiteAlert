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
    
    // Debounced search
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 200));
    document.getElementById('roleFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    
    // Add Admin button
    document.getElementById('addAdminBtn').addEventListener('click', function() {
        window.location.href = 'create_account.html';
    });
    
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

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Render the accounts table with modern UI
function populateAccountsTable(accounts) {
    const tableBody = document.getElementById('accountsTableBody');
    tableBody.innerHTML = '';

    accounts.forEach(account => {
        account.isActive = typeof account.isActive === 'boolean' ? account.isActive : account.isActive === true;
        const fullName = [account.firstName, account.middleName, account.lastName].filter(Boolean).join(' ');
        const initials = (account.firstName?.[0] || '') + (account.lastName?.[0] || '');
        const avatar = `<div class="user-avatar">${initials.toUpperCase()}</div>`;
        const userInfo = `
            <div class="user-info-modern">
                ${avatar}
                <div class="user-details">
                    <span class="fullname">${fullName}</span>
                    <span class="username">${account.username || account.email}</span>
                </div>
            </div>
        `;
        const status = account.role.toLowerCase() === 'superadmin'
            ? '<span class="status-badge">Always Active</span>'
            : `<span class="status-indicator ${account.isActive ? 'active' : 'inactive'}">${account.isActive ? 'Active' : 'Inactive'}</span>`;
        // Use data attributes, no inline onclick
        const actions = account.role.toLowerCase() === 'superadmin'
            ? `<div class="action-buttons">
                <button class="btn-change-password" data-account-id="${account.id}" data-action="change-password"><i class="fa-solid fa-key"></i> Change Password</button>
            </div>`
            : `<div class="action-buttons">
                <button class="btn-activate" data-account-id="${account.id}" data-action="activate" ${account.isActive ? 'style="display:none;"' : ''}><i class="fa-solid fa-check-circle"></i> Activate</button>
                <button class="btn-deactivate" data-account-id="${account.id}" data-action="deactivate" ${!account.isActive ? 'style="display:none;"' : ''}><i class="fa-solid fa-ban"></i> Deactivate</button>
                <button class="btn-change-password" data-account-id="${account.id}" data-action="change-password"><i class="fa-solid fa-key"></i> Change Password</button>
            </div>`;
        // Determine which ID to show
        const displayId = account.role.toLowerCase() === 'superadmin' ? (account.superAdminID || '-') : (account.adminID || '-');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${displayId}</td>
            <td>${userInfo}</td>
            <td><span class="role ${account.role.toLowerCase()}">${account.role}</span></td>
            <td>${status}</td>
            <td>${actions}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Add event delegation for action buttons (only once)
(function setupActionButtonDelegation() {
    document.addEventListener('DOMContentLoaded', function() {
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.addEventListener('click', function(e) {
            const actionBtn = e.target.closest('.btn-activate, .btn-deactivate, .btn-change-password');
            if (actionBtn) {
                const accountId = actionBtn.getAttribute('data-account-id');
                const action = actionBtn.getAttribute('data-action');
                if (accountId && action) {
                    if (action === 'change-password') {
                        showPasswordChangeModal(accountId);
                    } else {
                    handleActivation(accountId, action === 'activate');
                    }
                }
            }
        });
    });
})();

// Filtering and search
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;
    let filtered = adminAccounts;
    if (role !== 'all') {
        filtered = filtered.filter(acc => acc.role.toLowerCase() === role);
    }
    if (status !== 'all') {
        filtered = filtered.filter(acc => {
            if (acc.role.toLowerCase() === 'superadmin') return status === 'active';
            return status === 'active' ? acc.isActive : !acc.isActive;
        });
    }
    if (searchTerm) {
        filtered = filtered.filter(acc => {
            const fullName = [acc.firstName, acc.middleName, acc.lastName].filter(Boolean).join(' ');
            return (
                (acc.username && acc.username.toLowerCase().includes(searchTerm)) ||
                (acc.email && acc.email.toLowerCase().includes(searchTerm)) ||
                (fullName && fullName.toLowerCase().includes(searchTerm)) ||
                (acc.id && acc.id.toLowerCase().includes(searchTerm))
            );
        });
    }
    populateAccountsTable(filtered);
    // Show message if no results
    if (filtered.length === 0) {
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No matching accounts found</td></tr>';
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
        // Optimistic UI update
        const tableBody = document.getElementById('accountsTableBody');
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        let affectedRow = null;
        for (const row of rows) {
            if (row.innerHTML.includes(accountId)) {
                affectedRow = row;
                // Update status badge
                const statusCell = row.querySelector('.status-indicator');
                if (statusCell) {
                    statusCell.textContent = activate ? 'Active' : 'Inactive';
                    statusCell.className = `status-indicator ${activate ? 'active' : 'inactive'}`;
                }
                // Update buttons
                const btnActivate = row.querySelector('.btn-activate');
                const btnDeactivate = row.querySelector('.btn-deactivate');
                if (btnActivate) btnActivate.style.display = activate ? 'none' : '';
                if (btnDeactivate) btnDeactivate.style.display = activate ? '' : 'none';
            }
        }
        // Update the local data for filters/search
        const idx = adminAccounts.findIndex(acc => acc.id === accountId);
        let prevActive = null;
        if (idx !== -1) {
            prevActive = adminAccounts[idx].isActive;
            adminAccounts[idx].isActive = activate;
        }
        // Close modal immediately
        closeModal();
        // Now do the API call
        try {
            const updateResponse = await fetch('/api/update-account-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, isActive: activate })
            });
            const data = await updateResponse.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to update account status');
            }
            showToast(`Account successfully ${activate ? 'activated' : 'deactivated'}`, 'success');
            // Log to audit trail
            await logAuditTrail(accountId, `Account ${activate ? 'activated' : 'deactivated'}`);
        } catch (error) {
            // Revert UI if failed
            if (affectedRow) {
                const statusCell = affectedRow.querySelector('.status-indicator');
                if (statusCell) {
                    statusCell.textContent = prevActive ? 'Active' : 'Inactive';
                    statusCell.className = `status-indicator ${prevActive ? 'active' : 'inactive'}`;
                }
                const btnActivate = affectedRow.querySelector('.btn-activate');
                const btnDeactivate = affectedRow.querySelector('.btn-deactivate');
                if (btnActivate) btnActivate.style.display = prevActive ? 'none' : '';
                if (btnDeactivate) btnDeactivate.style.display = prevActive ? '' : 'none';
            }
            if (idx !== -1) {
                adminAccounts[idx].isActive = prevActive;
            }
            showToast(error.message || 'Error updating account status', 'error');
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
}

// Sign-out functionality
const signOutBtn = document.querySelector('.sign-out');
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
            let currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
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

// Close modal when clicking outside
if (signoutModal) {
    signoutModal.addEventListener('click', (e) => {
        if (e.target === signoutModal) {
            signoutModal.classList.remove('active');
        }
    });
}

// Add password change modal to the HTML
document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="passwordChangeModal">
        <div class="modal-content">
            <h3>Change Password</h3>
            <form id="passwordChangeForm">
                <div class="form-group">
                    <label for="currentPassword">Current Password</label>
                    <div class="password-input">
                        <input type="password" id="currentPassword" name="currentPassword" required>
                        <i class="fas fa-eye toggle-password"></i>
                    </div>
                </div>
                <div class="form-group">
                    <label for="newPassword">New Password</label>
                    <div class="password-input">
                        <input type="password" id="newPassword" name="newPassword" required>
                        <i class="fas fa-eye toggle-password"></i>
                    </div>
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password</label>
                    <div class="password-input">
                        <input type="password" id="confirmPassword" name="confirmPassword" required>
                        <i class="fas fa-eye toggle-password"></i>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="btn-cancel" onclick="closePasswordModal()">Cancel</button>
                    <button type="submit" class="btn-confirm">Change Password</button>
                </div>
            </form>
        </div>
    </div>
`);

// Add password change form handler
document.getElementById('passwordChangeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const modal = document.getElementById('passwordChangeModal');
    const accountId = modal.getAttribute('data-account-id');
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/profile/${accountId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to change password');
        }

        showToast('Password changed successfully', 'success');
        closePasswordModal();
        await logAuditTrail(accountId, 'Admin password changed');
    } catch (error) {
        showToast(error.message || 'Error changing password', 'error');
    }
});

// Add password toggle functionality
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

// Password change modal functions
function showPasswordChangeModal(accountId) {
    const modal = document.getElementById('passwordChangeModal');
    modal.classList.add('active');
    modal.setAttribute('data-account-id', accountId);
}

function closePasswordModal() {
    const modal = document.getElementById('passwordChangeModal');
    modal.classList.remove('active');
    document.getElementById('passwordChangeForm').reset();
}