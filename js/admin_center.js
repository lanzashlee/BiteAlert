const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');

let centers = [];
let editId = null;
let showArchived = false;

function renderTable() {
    console.log('Rendering table...');
    const tbody = $('#barangayTableBody');
    tbody.empty();
    
    if (centers.length === 0) {
        tbody.append(`
            <tr>
                <td colspan="5" class="text-center">No centers found</td>
            </tr>
        `);
        return;
    }
    
    centers.forEach((c, i) => {
        console.log('Rendering center:', c);
        tbody.append(`
            <tr>
                <td>${c.centerName || ''}</td>
                <td>${c.address || ''}</td>
                <td>${c.contactPerson || ''}</td>
                <td>${c.contactNumber || ''}</td>
                <td class="table-actions">
                    <button class="btn btn-xs btn-info" onclick="editCenter('${c._id}')">
                        <i class="fa fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-xs btn-danger" onclick="archiveCenter('${c._id}')">
                        <i class="fa fa-archive"></i> Archive
                    </button>
                </td>
            </tr>
        `);
    });
}

function resetForm() {
    $('#centerName').val('');
    $('#centerAddress').val('');
    $('#contactPerson').val('');
    $('#contactNumber').val('');
    editId = null;
    $('#addModalLabel').text('Add Center');
}

window.editCenter = function(id) {
    const c = centers.find(center => center._id === id);
    $('#centerName').val(c.centerName);
    $('#centerAddress').val(c.address);
    $('#contactPerson').val(c.contactPerson);
    $('#contactNumber').val(c.contactNumber);
    editId = id;
    $('#addModalLabel').text('Edit Center');
    $('#addModal').modal('show');
};

window.archiveCenter = async function(id) {
    // Validate ID
    if (!id) {
        alert('Invalid center ID');
        return;
    }

    // Find the center to be archived
    const centerToArchive = centers.find(c => c._id === id);
    if (!centerToArchive) {
        alert('Center not found');
        return;
    }

    // Populate modal with center details
    $('#archiveCenterName').text(centerToArchive.centerName);
    $('#archiveAddress').text(centerToArchive.address);
    $('#archiveContactPerson').text(centerToArchive.contactPerson);
    $('#archiveContactNumber').text(centerToArchive.contactNumber);

    // Store the center ID for the confirm button
    $('#confirmArchiveBtn').data('center-id', id);

    // Show the modal
    $('#archiveModal').modal('show');
};

window.restoreCenter = async function(id) {
    if (confirm('Are you sure you want to restore this center?')) {
        try {
            const response = await fetch(`/api/centers/${id}/archive`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isArchived: false })
            });
            const result = await response.json();
            if (result.success) {
                loadCenters();
            } else {
                alert('Failed to restore center: ' + result.message);
            }
        } catch (error) {
            console.error('Error restoring center:', error);
            alert('Error restoring center. Please try again.');
        }
    }
};

window.manageServiceHours = async function(centerId) {
    const center = centers.find(c => c._id === centerId);
    if (!center) return;
    $('#serviceHoursModalLabel').text(`Service Hours - ${center.centerName}`);
    $('#serviceHoursErrorMsg').hide();
    $('#serviceHoursTable tbody').empty();
    $('#serviceHoursForm').data('center-id', centerId);
    // Fetch service hours from API
    try {
        const response = await fetch(`/api/centers/${centerId}/service-hours`);
        const result = await response.json();
        let serviceHours = Array.isArray(result.serviceHours) ? result.serviceHours : [];
        if (!serviceHours.length) {
            // Default: Mon-Fri 08:00-17:00
            serviceHours = [
                { day: 'Monday', open: '08:00', close: '17:00' },
                { day: 'Tuesday', open: '08:00', close: '17:00' },
                { day: 'Wednesday', open: '08:00', close: '17:00' },
                { day: 'Thursday', open: '08:00', close: '17:00' },
                { day: 'Friday', open: '08:00', close: '17:00' }
            ];
        }
        renderServiceHoursRows(serviceHours);
        $('#serviceHoursModal').modal('show');
    } catch (err) {
        $('#serviceHoursErrorMsg').text('Failed to load service hours.').show();
        $('#serviceHoursModal').modal('show');
    }
};

function renderServiceHoursRows(serviceHours) {
    const tbody = $('#serviceHoursTable tbody');
    tbody.empty();
    serviceHours.forEach((row, idx) => {
        tbody.append(`
            <tr>
                <td><input type="text" class="form-control day-input" value="${row.day}" required></td>
                <td><input type="time" class="form-control open-input" value="${row.open}" required></td>
                <td><input type="time" class="form-control close-input" value="${row.close}" required></td>
                <td><button type="button" class="btn btn-danger btn-xs remove-row"><i class="fa fa-trash"></i></button></td>
            </tr>
        `);
    });
}

$(document).on('click', '#addServiceHourRow', function() {
    $('#serviceHoursTable tbody').append(`
        <tr>
            <td><input type="text" class="form-control day-input" value="" required></td>
            <td><input type="time" class="form-control open-input" value="08:00" required></td>
            <td><input type="time" class="form-control close-input" value="17:00" required></td>
            <td><button type="button" class="btn btn-danger btn-xs remove-row"><i class="fa fa-trash"></i></button></td>
        </tr>
    `);
});

$(document).on('click', '.remove-row', function() {
    $(this).closest('tr').remove();
});

$('#serviceHoursForm').on('submit', async function(e) {
    e.preventDefault();
    const centerId = $(this).data('center-id');
    const rows = $('#serviceHoursTable tbody tr');
    const serviceHours = [];
    let valid = true;
    rows.each(function() {
        const day = $(this).find('.day-input').val().trim();
        const open = $(this).find('.open-input').val();
        const close = $(this).find('.close-input').val();
        if (!day || !open || !close) {
            valid = false;
            return false;
        }
        serviceHours.push({ day, open, close });
    });
    if (!valid || !serviceHours.length) {
        $('#serviceHoursErrorMsg').text('All fields are required.').show();
        return;
    }
    try {
        const response = await fetch(`/api/centers/${centerId}/service-hours`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceHours })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        $('#serviceHoursModal').modal('hide');
    } catch (err) {
        $('#serviceHoursErrorMsg').text('Failed to save service hours.').show();
    }
});

$('#addModal').on('hidden.bs.modal', resetForm);

$('#barangayForm').on('submit', async function(e) {
    e.preventDefault();
    const centerName = $('#centerName').val();
    const address = $('#centerAddress').val().trim();
    const contactPerson = $('#contactPerson').val().trim();
    const contactNumber = $('#contactNumber').val().trim();

    // Show error in modal if any field is empty
    if (!centerName || !address || !contactPerson || !contactNumber) {
        $('#formErrorMsg').text('All fields are required.').show();
        return;
    } else {
        $('#formErrorMsg').hide();
    }

    // Check for duplicate center name
    const duplicate = centers.some(c => c.centerName && c.centerName.toLowerCase() === centerName.toLowerCase() && (!editId || c._id !== editId));
    if (duplicate) {
        // Show duplicate modal instead of just error message
        $('#duplicateCenterModal').modal('show');
        return;
    }

    const center = { centerName, address, contactPerson, contactNumber };

    try {
        if (editId) {
            const response = await fetch(`/api/centers/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(center)
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }
        } else {
            const response = await fetch('/api/centers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(center)
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message);
            }
        }
        $('#addModal').modal('hide');
        await loadCenters();
    } catch (error) {
        console.error('Error saving center:', error);
        $('#formErrorMsg').text('Error saving center: ' + error.message).show();
    }
});

async function loadCenters() {
    try {
        console.log('Fetching centers...');
        const response = await fetch('/api/centers');
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            centers = result.data.filter(c => !c.isArchived);
            console.log('Loaded centers:', centers);
            renderTable();
        } else {
            console.error('Failed to load centers:', result.message);
            alert('Failed to load centers. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error loading centers:', error);
        alert('Error loading centers. Please refresh the page.');
    }
}

// Toggle between active and archived views
$('#viewArchivedBtn').on('click', function() {
    showArchived = !showArchived;
    $(this).html(showArchived ? 
        '<i class="fa fa-list"></i> View Active' : 
        '<i class="fa fa-archive"></i> View Archived'
    );
    renderTable();
});

$(document).ready(loadCenters);

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

// Add Sample Data Button
$('#addSampleDataBtn').on('click', async function() {
    if (confirm('This will replace all existing center data with sample data. Continue?')) {
        try {
            const response = await fetch('/api/insert-sample-centers', {
                method: 'POST'
            });
            const result = await response.json();
            if (result.success) {
                alert('Sample centers added successfully!');
                await loadCenters();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error adding sample centers:', error);
            alert('Error adding sample centers: ' + error.message);
        }
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

// Add this after the existing modals in the HTML
$('body').append(`
    <div class="modal fade" id="archiveModal" tabindex="-1" role="dialog" aria-labelledby="archiveModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="archiveModalLabel">Confirm Archive</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to archive the following center?</p>
                    <div class="center-details">
                        <p><strong>Center Name:</strong> <span id="archiveCenterName"></span></p>
                        <p><strong>Address:</strong> <span id="archiveAddress"></span></p>
                        <p><strong>Contact Person:</strong> <span id="archiveContactPerson"></span></p>
                        <p><strong>Contact Number:</strong> <span id="archiveContactNumber"></span></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger" id="confirmArchiveBtn">
                        <i class="fa fa-archive"></i> Archive Center
                    </button>
                </div>
            </div>
        </div>
    </div>
`);

// Add event listener for the confirm archive button
$('#confirmArchiveBtn').on('click', async function() {
    const id = $(this).data('center-id');
    const $btn = $(this);
    
    try {
        // Show loading state
        $btn.prop('disabled', true)
            .html('<i class="fa fa-spinner fa-spin"></i> Archiving...');

        const response = await fetch(`/api/centers/${id}/archive`, { 
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ isArchived: true })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            // Close the modal
            $('#archiveModal').modal('hide');
            await loadCenters();
        } else {
            throw new Error(result.message || 'Failed to archive center');
        }
    } catch (error) {
        console.error('Error archiving center:', error);
        alert('Error archiving center: ' + (error.message || 'Please try again'));
    } finally {
        // Reset button state
        $btn.prop('disabled', false)
            .html('<i class="fa fa-archive"></i> Archive Center');
    }
});

// Reset modal when it's hidden
$('#archiveModal').on('hidden.bs.modal', function() {
    $('#confirmArchiveBtn').prop('disabled', false)
        .html('<i class="fa fa-archive"></i> Archive Center');
});

