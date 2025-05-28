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
}    // Load initial data
    loadReportData();
    
    
    // Sign out functionality
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    } else {
        console.error('Sign out button not found');
    }

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
                        allItems.push({
                            centerName: center.centerName,
                            name: vaccine.name,
                            type: vaccine.type,
                            brand: vaccine.brand,
                            quantity: typeof vaccine.stock === 'object' && vaccine.stock.$numberDouble !== undefined ? parseFloat(vaccine.stock.$numberDouble) : (typeof vaccine.stock === 'object' && vaccine.stock.$numberInt !== undefined ? parseInt(vaccine.stock.$numberInt) : vaccine.stock)
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
        document.getElementById('totalItems').textContent = totalStock;
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
}); 