let centers = [];

function renderTable() {
    console.log('Rendering archived centers table...');
    const tbody = $('#archiveTableBody');
    tbody.empty();
    
    if (centers.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="5" class="text-center">No archived centers found</td>
            </tr>
        `);
        return;
    }
    
    centers.forEach((c, i) => {
        console.log('Rendering archived center:', c);
        tbody.append(`
            <tr>
                <td>${c.centerName || ''}</td>
                <td>${c.address || ''}</td>
                <td>${c.contactPerson || ''}</td>
                <td>${c.contactNumber || ''}</td>
                <td class="table-actions">
                    <button class="btn btn-xs btn-success" onclick="restoreCenter('${c._id}')">
                        <i class="fa fa-undo"></i> Restore
                    </button>
                </td>
            </tr>
        `);
    });
}

async function loadArchivedCenters() {
    try {
        console.log('Fetching archived centers...');
        const response = await fetch('/api/centers');
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            centers = result.data.filter(c => c.isArchived);
            console.log('Loaded archived centers:', centers);
            renderTable();
        } else {
            console.error('Failed to load archived centers:', result.message);
            alert('Failed to load archived centers. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error loading archived centers:', error);
        alert('Error loading archived centers. Please refresh the page.');
    }
}

// Add the restore modal to the page
$('body').append(`
    <div class="modal fade" id="restoreModal" tabindex="-1" role="dialog" aria-labelledby="restoreModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="restoreModalLabel">Confirm Restore</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to restore the following center?</p>
                    <div class="center-details">
                        <p><strong>Center Name:</strong> <span id="restoreCenterName"></span></p>
                        <p><strong>Address:</strong> <span id="restoreAddress"></span></p>
                        <p><strong>Contact Person:</strong> <span id="restoreContactPerson"></span></p>
                        <p><strong>Contact Number:</strong> <span id="restoreContactNumber"></span></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-success" id="confirmRestoreBtn">
                        <i class="fa fa-undo"></i> Restore Center
                    </button>
                </div>
            </div>
        </div>
    </div>
`);

// Update restoreCenter to use the modal
async function restoreCenter(id) {
    // Find the center to be restored
    const centerToRestore = centers.find(c => c._id === id);
    if (!centerToRestore) {
        return;
    }
    // Populate modal with center details
    $('#restoreCenterName').text(centerToRestore.centerName);
    $('#restoreAddress').text(centerToRestore.address);
    $('#restoreContactPerson').text(centerToRestore.contactPerson);
    $('#restoreContactNumber').text(centerToRestore.contactNumber);
    // Store the center ID for the confirm button
    $('#confirmRestoreBtn').data('center-id', id);
    // Show the modal
    $('#restoreModal').modal('show');
}

// Add event listener for the confirm restore button
$('#confirmRestoreBtn').on('click', async function() {
    const id = $(this).data('center-id');
    const $btn = $(this);
    try {
        // Show loading state
        $btn.prop('disabled', true)
            .html('<i class="fa fa-spinner fa-spin"></i> Restoring...');
        const response = await fetch(`/api/centers/${id}/archive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: false })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            $('#restoreModal').modal('hide');
            await loadArchivedCenters();
        } else {
            throw new Error(result.message || 'Failed to restore center');
        }
    } catch (error) {
        console.error('Error restoring center:', error);
    } finally {
        $btn.prop('disabled', false)
            .html('<i class="fa fa-undo"></i> Restore Center');
    }
});

// Reset modal when it's hidden
$('#restoreModal').on('hidden.bs.modal', function() {
    $('#confirmRestoreBtn').prop('disabled', false)
        .html('<i class="fa fa-undo"></i> Restore Center');
});

$(document).ready(loadArchivedCenters);

// Sign-out functionality
document.querySelector('.sign-out')?.addEventListener('click', () => {
    const signoutModal = document.getElementById('signoutModal');
    if (signoutModal) {
        signoutModal.classList.add('active');
    }
});

// Handle signout confirmation
document.getElementById('confirmSignout')?.addEventListener('click', async () => {
    try {
        let currentUser = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('userData'));
        
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

        const logoutData = {
            role: currentUser.role,
            firstName: currentUser.firstName,
            middleName: currentUser.middleName || '',
            lastName: currentUser.lastName,
            action: 'Signed out'
        };

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

        localStorage.removeItem('currentUser');
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        
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