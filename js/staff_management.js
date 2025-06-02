document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const searchInput = document.getElementById('staff-search');
    const roleFilter = document.getElementById('role-filter');
    const statusFilter = document.getElementById('status-filter');
    const staffTable = document.querySelector('.staff-table');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const tableContainer = document.querySelector('.table-container');
    const mobileFilters = document.querySelector('.mobile-filters');
    const filterToggle = document.querySelector('.filter-toggle');
    const mainContent = document.querySelector('.main-content');

    // Responsive table setup
    function setupResponsiveTable() {
        if (window.innerWidth <= 768) {
            // Convert table to cards on mobile
            if (staffTable && !staffTable.classList.contains('mobile-view')) {
                convertTableToCards();
            }
        } else {
            // Convert back to table on desktop
            if (staffTable && staffTable.classList.contains('mobile-view')) {
                convertCardsToTable();
            }
        }
    }

    // Convert table to cards for mobile view
    function convertTableToCards() {
        const tbody = staffTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Create cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'staff-cards';
        
        rows.forEach(row => {
            const card = document.createElement('div');
            card.className = 'staff-card';
            card.setAttribute('data-staff-id', row.getAttribute('data-staff-id'));
            
            const cells = Array.from(row.querySelectorAll('td'));
            cells.forEach((cell, index) => {
                if (index === 0) return; // Skip ID column
                
                const field = document.createElement('div');
                field.className = `staff-field ${cell.className}`;
                
                if (cell.querySelector('.status-badge')) {
                    field.innerHTML = cell.innerHTML;
                } else {
                    field.textContent = cell.textContent;
                }
                
                card.appendChild(field);
            });
            
            // Add action buttons
            const actions = document.createElement('div');
            actions.className = 'card-actions';
            actions.innerHTML = row.querySelector('.action-buttons').innerHTML;
            card.appendChild(actions);
            
            cardsContainer.appendChild(card);
        });
        
        // Replace table with cards
        staffTable.classList.add('mobile-view');
        tableContainer.appendChild(cardsContainer);
        staffTable.style.display = 'none';
    }

    // Convert cards back to table
    function convertCardsToTable() {
        const cardsContainer = document.querySelector('.staff-cards');
        if (cardsContainer) {
            cardsContainer.remove();
        }
        staffTable.classList.remove('mobile-view');
        staffTable.style.display = 'table';
    }

    // Toggle mobile filters
    if (filterToggle) {
        filterToggle.addEventListener('click', () => {
            mobileFilters.classList.toggle('active');
        });
    }

    // Close mobile filters when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileFilters && !e.target.closest('.mobile-filters') && !e.target.closest('.filter-toggle')) {
            mobileFilters.classList.remove('active');
        }
    });

    // Menu Toggle Functionality
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

    // Initialize tooltips for action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        const tooltip = btn.getAttribute('data-tooltip');
        if (tooltip) {
            btn.setAttribute('title', tooltip);
        }
    });

    // Search functionality with debounce and validation
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            let searchTerm = e.target.value.trim();
            // Only allow alphanumeric and space
            if (/[^a-zA-Z0-9\s]/.test(searchTerm)) {
                showNotification('Only letters, numbers, and spaces are allowed in search.', 'error');
                searchInput.value = searchTerm.replace(/[^a-zA-Z0-9\s]/g, '');
                return;
            }
            filterTable();
        }, 300);
    });

    // Filter change handlers
    roleFilter?.addEventListener('change', filterTable);
    statusFilter?.addEventListener('change', filterTable);

    // Combined filter function
    function filterTable() {
        const searchTerm = searchInput?.value.trim().toLowerCase() || '';
        const selectedRole = roleFilter?.value || '';
        const selectedStatus = statusFilter?.value || '';
        
        if (staffTable.classList.contains('mobile-view')) {
            // Filter cards
            const cards = document.querySelectorAll('.staff-card');
            cards.forEach(card => {
                const name = card.querySelector('.staff-field:nth-child(1)')?.textContent.toLowerCase() || '';
                const role = card.querySelector('.staff-field:nth-child(2)')?.textContent.toLowerCase() || '';
                const status = card.querySelector('.status-badge')?.getAttribute('data-status')?.toLowerCase() || '';

                const matchesSearch = name.includes(searchTerm);
                const matchesRole = selectedRole === '' || role === selectedRole.toLowerCase();
                const matchesStatus = selectedStatus === '' || status === selectedStatus.toLowerCase();

                card.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
            });
        } else {
            // Filter table rows
            const rows = staffTable?.querySelectorAll('tbody tr');
            if (!rows) return;

            rows.forEach(row => {
                const name = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
                const role = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
                const status = row.querySelector('.status-badge')?.getAttribute('data-status')?.toLowerCase() || '';

                const matchesSearch = name.includes(searchTerm);
                const matchesRole = selectedRole === '' || role === selectedRole.toLowerCase();
                const matchesStatus = selectedStatus === '' || status === selectedStatus.toLowerCase();

                row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
            });
        }
    }

    // Custom confirmation modal function
    function customConfirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const msg = document.getElementById('confirmModalMessage');
            const okBtn = document.getElementById('confirmModalOk');
            const cancelBtn = document.getElementById('confirmModalCancel');
            msg.textContent = message;
            modal.style.display = 'flex';
            function cleanup(result) {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', okHandler);
                cancelBtn.removeEventListener('click', cancelHandler);
                resolve(result);
            }
            function okHandler() { cleanup(true); }
            function cancelHandler() { cleanup(false); }
            okBtn.addEventListener('click', okHandler);
            cancelBtn.addEventListener('click', cancelHandler);
        });
    }

    // Toggle staff status
    const toggleButtons = document.querySelectorAll('.toggle-status');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
            const currentStatus = this.getAttribute('data-status');
            const staffId = this.closest('tr, .staff-card').getAttribute('data-staff-id');
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            try {
                showLoading();
                // Simulate API call - Replace with actual API endpoint
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Update UI
                this.setAttribute('data-status', newStatus);
                this.setAttribute('data-tooltip', `${newStatus === 'active' ? 'Deactivate' : 'Activate'} staff`);
                
                const statusBadge = this.closest('tr, .staff-card').querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                    statusBadge.className = `status-badge ${newStatus}`;
                    statusBadge.setAttribute('data-status', newStatus);
                }

                // Show success message
                showNotification(`Staff status updated to ${newStatus}`, 'success');
            } catch (error) {
                console.error('Error updating staff status:', error);
                showNotification('Failed to update staff status', 'error');
            } finally {
                hideLoading();
            }
        });
    });

    // Loading state handlers
    function showLoading() {
        loadingOverlay?.classList.add('active');
    }

    function hideLoading() {
        loadingOverlay?.classList.remove('active');
    }

    // Notification system
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add notification styles dynamically
    const notificationStyles = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            max-width: 90%;
            text-align: center;
        }
        
        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .notification.success {
            background: #2e7d32;
        }
        
        .notification.error {
            background: #c62828;
        }

        @media (max-width: 768px) {
            .notification {
                left: 20px;
                right: 20px;
                bottom: 20px;
                width: auto;
            }
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);

    // Initialize responsive table
    setupResponsiveTable();
    
    // Update on window resize
    window.addEventListener('resize', setupResponsiveTable);

    // Fetch and render staff data
    async function loadStaffs() {
        try {
            const response = await fetch('/api/staffs');
            const data = await response.json();
            if (data.success) {
                renderStaffTable(data.staffs);
            } else {
                showNotification('Failed to load staff data', 'error');
            }
        } catch (error) {
            showNotification('Error loading staff data', 'error');
        }
    }

    function renderStaffTable(staffs) {
        const tbody = staffTable.querySelector('tbody');
        tbody.innerHTML = '';
        staffs.forEach((staff) => {
            let actionButtons = '';
            let statusText = '';
            let statusClass = '';
            // Show Approve/Reject if not approved or not verified
            if (staff.isApproved === undefined || staff.isVerified === false) {
                statusText = 'Pending';
                statusClass = 'inactive';
                actionButtons = `
                    <button class="action-btn approve-btn" data-id="${staff._id}">Approve</button>
                    <button class="action-btn reject-btn" data-id="${staff._id}">Reject</button>
                `;
            } else if (staff.isApproved) {
                statusText = 'Active';
                statusClass = 'active';
                actionButtons = `<button class="action-btn deactivate-btn" data-id="${staff._id}">Deactivate</button>`;
            } else {
                statusText = 'Inactive';
                statusClass = 'inactive';
                actionButtons = `<button class="action-btn activate-btn" data-id="${staff._id}">Activate</button>`;
            }
            const tr = document.createElement('tr');
            tr.setAttribute('data-staff-id', staff._id);
            tr.innerHTML = `
                <td>${staff.staffId || ''}</td>
                <td>${staff.firstName || (staff.fullName ? staff.fullName.split(' ')[0] : '')}</td>
                <td>${staff.middleName || (staff.fullName && staff.fullName.split(' ').length === 3 ? staff.fullName.split(' ')[1] : '')}</td>
                <td>${staff.lastName || (staff.fullName ? staff.fullName.split(' ').slice(-1)[0] : '')}</td>
                <td>${staff.role || ''}</td>
                <td>${staff.phone || ''}</td>
                <td>
                    <span class="status-badge ${statusClass}" data-status="${statusText.toLowerCase()}">
                        ${statusText}
                    </span>
                </td>
                <td class="action-buttons">
                    ${actionButtons}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Approve
        tbody.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                const confirmed = await customConfirm('Are you sure you want to approve this staff account?');
                if (confirmed) {
                    const res = await fetch(`/api/staffs/${id}/approve`, { method: 'POST' });
                    if (res.ok) {
                        // Update the row in-place
                        const row = this.closest('tr, .staff-card');
                        // Update status badge
                        const statusBadge = row.querySelector('.status-badge');
                        if (statusBadge) {
                            statusBadge.textContent = 'Active';
                            statusBadge.className = 'status-badge active';
                            statusBadge.setAttribute('data-status', 'active');
                        }
                        // Update action buttons
                        const actionsCell = row.querySelector('td:last-child, .card-actions');
                        if (actionsCell) {
                            actionsCell.innerHTML = `<button class="action-btn deactivate-btn" data-id="${id}">Deactivate</button>`;
                            // Re-attach deactivate event
                            actionsCell.querySelector('.deactivate-btn').addEventListener('click', async function() {
                                const confirmed = await customConfirm('Are you sure you want to deactivate this staff account?');
                                if (confirmed) {
                                    const res = await fetch(`/api/staffs/${id}/deactivate`, { method: 'POST' });
                                    if (res.ok) {
                                        // Optionally update UI here as well
                                        showNotification('Staff deactivated', 'success');
                                    } else {
                                        showNotification('Failed to deactivate staff', 'error');
                                    }
                                }
                            });
                        }
                        showNotification('Staff approved', 'success');
                    } else {
                        showNotification('Failed to approve staff', 'error');
                    }
                }
            });
        });
        // Reject
        tbody.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                const confirmed = await customConfirm('Are you sure you want to reject this staff account?');
                if (confirmed) {
                    const res = await fetch(`/api/staffs/${id}`, { method: 'DELETE' });
                    if (res.ok) loadStaffs();
                    else showNotification('Failed to reject staff', 'error');
                }
            });
        });
        // Deactivate
        tbody.querySelectorAll('.deactivate-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                const confirmed = await customConfirm('Are you sure you want to deactivate this staff account? This will prevent the staff from accessing the system.');
                if (confirmed) {
                    const res = await fetch(`/api/staffs/${id}/deactivate`, { method: 'POST' });
                    if (res.ok) {
                        // --- Real-time UI update ---
                        const row = this.closest('tr, .staff-card');
                        // Update status badge
                        const statusBadge = row.querySelector('.status-badge');
                        if (statusBadge) {
                            statusBadge.textContent = 'Inactive';
                            statusBadge.className = 'status-badge inactive';
                            statusBadge.setAttribute('data-status', 'inactive');
                        }
                        // Update action buttons
                        const actionsCell = row.querySelector('td:last-child, .card-actions');
                        if (actionsCell) {
                            actionsCell.innerHTML = `<button class="action-btn activate-btn" data-id="${id}">Activate</button>`;
                            // Re-attach activate event
                            actionsCell.querySelector('.activate-btn').addEventListener('click', async function() {
                                const confirmed = await customConfirm('Are you sure you want to activate this staff account? The staff will regain access to the system.');
                                if (confirmed) {
                                    const res = await fetch(`/api/staffs/${id}/activate`, { method: 'POST' });
                                    if (res.ok) {
                                        // Real-time UI update for activation
                                        const row = this.closest('tr, .staff-card');
                                        const statusBadge = row.querySelector('.status-badge');
                                        if (statusBadge) {
                                            statusBadge.textContent = 'Active';
                                            statusBadge.className = 'status-badge active';
                                            statusBadge.setAttribute('data-status', 'active');
                                        }
                                        const actionsCell = row.querySelector('td:last-child, .card-actions');
                                        if (actionsCell) {
                                            actionsCell.innerHTML = `<button class="action-btn deactivate-btn" data-id="${id}">Deactivate</button>`;
                                            // Re-attach deactivate event
                                            actionsCell.querySelector('.deactivate-btn').addEventListener('click', async function() {
                                                const confirmed = await customConfirm('Are you sure you want to deactivate this staff account? This will prevent the staff from accessing the system.');
                                                if (confirmed) {
                                                    const res = await fetch(`/api/staffs/${id}/deactivate`, { method: 'POST' });
                                                    if (res.ok) {
                                                        // Real-time UI update for deactivation
                                                        const row = this.closest('tr, .staff-card');
                                                        const statusBadge = row.querySelector('.status-badge');
                                                        if (statusBadge) {
                                                            statusBadge.textContent = 'Inactive';
                                                            statusBadge.className = 'status-badge inactive';
                                                            statusBadge.setAttribute('data-status', 'inactive');
                                                        }
                                                        const actionsCell = row.querySelector('td:last-child, .card-actions');
                                                        if (actionsCell) {
                                                            actionsCell.innerHTML = `<button class="action-btn activate-btn" data-id="${id}">Activate</button>`;
                                                            // Re-attach activate event
                                                            actionsCell.querySelector('.activate-btn').addEventListener('click', arguments.callee.caller);
                                                        }
                                                        showNotification('Staff deactivated', 'success');
                                                    } else {
                                                        showNotification('Failed to deactivate staff', 'error');
                                                    }
                                                }
                                            });
                                        }
                                        showNotification('Staff activated', 'success');
                                    } else {
                                        showNotification('Failed to activate staff', 'error');
                                    }
                                }
                            });
                        }
                        showNotification('Staff deactivated', 'success');
                    } else {
                        showNotification('Failed to deactivate staff', 'error');
                    }
                }
            });
        });
        // Activate
        tbody.querySelectorAll('.activate-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                const confirmed = await customConfirm('Are you sure you want to activate this staff account? The staff will regain access to the system.');
                if (confirmed) {
                    const res = await fetch(`/api/staffs/${id}/activate`, { method: 'POST' });
                    if (res.ok) loadStaffs();
                    else showNotification('Failed to activate staff', 'error');
                }
            });
        });
    }

    // Initial load
    loadStaffs();

    // Sign-out functionality
    const signOutBtn = document.getElementById('signOutBtn');
    signOutBtn?.addEventListener('click', () => {
        const signoutModal = document.getElementById('signoutModal');
        if (signoutModal) {
            signoutModal.classList.add('active');
        }
    });

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
}); 