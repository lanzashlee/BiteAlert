// Inventory Management Script for admin_stock.html

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const inventoryTableBody = document.getElementById('inventoryTableBody');
    const exportBtn = document.getElementById('exportBtn');
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toast = document.getElementById('toast');
    const paginationInfo = document.getElementById('paginationInfo');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const signOutBtn = document.querySelector('.sign-out');

    // State
    let allItems = [];
    let currentSort = { column: null, direction: 'asc' };
    let currentPage = 1;
    const itemsPerPage = 10;

    // Initialize
    loadInventory();
    setupEventListeners();

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


    
    
    // Sign out functionality
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            const signoutModal = document.getElementById('signoutModal');
            if (signoutModal) {
                signoutModal.classList.add('active');
            }
        });
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

    // Event Listeners Setup
    function setupEventListeners() {
        // Search and Filter
        if (searchInput) searchInput.addEventListener('input', debounce(handleSearch, 300));
        if (typeFilter) typeFilter.addEventListener('change', handleFilter);
        if (statusFilter) statusFilter.addEventListener('change', handleFilter);
        // Table Sorting
        document.querySelectorAll('.inventory-table th').forEach(th => {
            th.addEventListener('click', () => handleSort(th));
        });
        // Export
        if (exportBtn) exportBtn.addEventListener('click', exportInventoryData);
    }

    // Load Inventory Data
    async function loadInventory() {
        showLoading();
        try {
            // Fetch from /api/vaccinestocks
            const res = await fetch('/api/vaccinestocks');
            const result = await res.json();
            if (!result.success) throw new Error('Failed to fetch vaccine stocks');
            // Flatten vaccines for table rendering
            allItems = [];
            result.data.forEach(center => {
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
                        allItems.push({
                            centerName: center.centerName,
                            name: vaccine.name,
                            type: vaccine.type,
                            brand: vaccine.brand,
                            quantity
                        });
                    });
                }
            });
            renderInventoryTable();
            updateStatistics();
        } catch (err) {
            showError('Failed to load vaccine stocks');
            console.error('Error loading vaccine stocks:', err);
        } finally {
            hideLoading();
        }
    }

    // Render Inventory Table
    function renderInventoryTable() {
        if (!inventoryTableBody) return;
        const filteredItems = filterItems();
        const sortedItems = sortItems(filteredItems);
        const paginatedItems = paginateItems(sortedItems);

        inventoryTableBody.innerHTML = '';
        paginatedItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.centerName || '-'}</td>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.brand || '-'}</td>
                <td>${item.quantity}</td>
            `;
            inventoryTableBody.appendChild(tr);
        });
        updatePaginationInfo(filteredItems.length);
    }

    // Filter Items
    function filterItems() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const typeValue = typeFilter ? typeFilter.value : '';
        const statusValue = statusFilter ? statusFilter.value : '';
        return allItems.filter(item => {
            const matchesSearch = !searchTerm || 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.centerName && item.centerName.toLowerCase().includes(searchTerm));
            const matchesType = !typeValue || item.type === typeValue;
            let matchesStatus = true;
            if (statusValue === 'low') matchesStatus = item.quantity <= 10 && item.quantity > 0;
            else if (statusValue === 'out') matchesStatus = item.quantity === 0;
            return matchesSearch && matchesType && matchesStatus;
        });
    }

    // Sort Items
    function sortItems(items) {
        if (!currentSort.column) return items;
        return [...items].sort((a, b) => {
            let aValue = a[currentSort.column];
            let bValue = b[currentSort.column];
            if (aValue < bValue) return currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Paginate Items
    function paginateItems(items) {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }

    // Update Pagination Info
    function updatePaginationInfo(totalItems) {
        if (!paginationInfo) return;
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(start + itemsPerPage - 1, totalItems);
        paginationInfo.textContent = `Showing ${start}-${end} of ${totalItems} items`;
    }

    // Handle Search
    function handleSearch() {
        currentPage = 1;
        renderInventoryTable();
    }

    // Handle Filter
    function handleFilter() {
        currentPage = 1;
        renderInventoryTable();
    }

    // Handle Sort
    function handleSort(th) {
        const column = th.textContent.trim().toLowerCase().replace(/ /g, '');
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        renderInventoryTable();
    }

    // Export Inventory Data
    function exportInventoryData() {
        const filteredItems = filterItems();
        const csvContent = [
            ['Center', 'Vaccine Name', 'Type', 'Brand', 'Stock Left'],
            ...filteredItems.map(item => [
                item.centerName,
                item.name,
                item.type,
                item.brand,
                item.quantity
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `vaccine_stock_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // Update Statistics
    function updateStatistics() {
        // Sum total stock left across all vaccines
        const totalStock = allItems.reduce((sum, item) => sum + (typeof item.quantity === 'number' ? item.quantity : 0), 0);
        const lowStock = allItems.filter(item => item.quantity <= 10 && item.quantity > 0).length;
        const outOfStock = allItems.filter(item => item.quantity === 0).length;
        
        // Format total stock to remove excessive zeros
        const formattedTotal = Number(totalStock).toLocaleString();
        
        document.getElementById('totalItems').textContent = formattedTotal;
        document.getElementById('lowStockItems').textContent = lowStock;
        document.getElementById('outOfStockItems').textContent = outOfStock;
        document.getElementById('expiredItems').textContent = 0;
    }

    // Show/Hide Loading
    function showLoading() { if (loadingOverlay) loadingOverlay.style.display = 'flex'; }
    function hideLoading() { if (loadingOverlay) loadingOverlay.style.display = 'none'; }

    // Toast Notifications
    function showSuccess(msg) { showToast(msg, 'success'); }
    function showError(msg) { showToast(msg, 'error'); }
    function showToast(msg, type) {
        if (!toast) return;
        toast.className = 'toast ' + type;
        const messageElement = toast.querySelector('.toast-message');
        if (messageElement) messageElement.textContent = msg;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Utility Functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Custom tooltip for stat cards
    const statCardTooltip = document.getElementById('statCardTooltip');
    function showStatTooltip(card, title, items) {
        let html = `<div class='tooltip-title'>${title}</div>`;
        if (items.length === 0) {
            html += `<div class='tooltip-empty'>None</div>`;
        } else {
            html += `<ul class='tooltip-list'>`;
            items.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul>`;
        }
        html += `<div class='tooltip-arrow'></div>`;
        statCardTooltip.innerHTML = html;
        statCardTooltip.style.display = 'block';
        // Position below the card, centered
        const rect = card.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        statCardTooltip.style.left = (rect.left + rect.width/2 - statCardTooltip.offsetWidth/2) + 'px';
        statCardTooltip.style.top = (rect.bottom + scrollY + 18) + 'px';
        // Animate in
        setTimeout(() => {
            statCardTooltip.classList.add('show-tooltip');
            statCardTooltip.style.left = (rect.left + rect.width/2 - statCardTooltip.offsetWidth/2) + 'px';
            statCardTooltip.style.top = (rect.bottom + scrollY + 18) + 'px';
        }, 10);
    }
    function hideStatTooltip() {
        statCardTooltip.classList.remove('show-tooltip');
        setTimeout(() => {
            statCardTooltip.style.display = 'none';
        }, 220);
    }
    // Attach listeners for each stat card
    const lowStockCard = document.getElementById('lowStockCard');
    const outStockCard = document.getElementById('outStockCard');
    const expiredCard = document.getElementById('expiredCard');
    if (lowStockCard) {
        lowStockCard.addEventListener('mouseenter', function() {
            const items = allItems.filter(item => item.quantity <= 10 && item.quantity > 0)
                .map(item => `${item.name} (${item.centerName}): <b>${item.quantity}</b>`);
            showStatTooltip(lowStockCard, 'Low Stock Vaccines', items);
        });
        lowStockCard.addEventListener('mouseleave', hideStatTooltip);
    }
    if (outStockCard) {
        outStockCard.addEventListener('mouseenter', function() {
            const items = allItems.filter(item => item.quantity === 0)
                .map(item => `${item.name} (${item.centerName})`);
            showStatTooltip(outStockCard, 'Out of Stock Vaccines', items);
        });
        outStockCard.addEventListener('mouseleave', hideStatTooltip);
    }
    if (expiredCard) {
        expiredCard.addEventListener('mouseenter', function() {
            // If you track expiry, filter here. For now, show placeholder.
            const items = [];
            showStatTooltip(expiredCard, 'Expired Vaccines', items);
        });
        expiredCard.addEventListener('mouseleave', hideStatTooltip);
    }
}); 