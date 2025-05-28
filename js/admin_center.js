const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');

let centers = [];
let editId = null;

function renderTable() {
    const tbody = $('#barangayTableBody');
    tbody.empty();
    centers.forEach((c, i) => {
        tbody.append(`
            <tr>
                <td>${c.centerName}</td>
                <td>${c.address}</td>
                <td>${c.contactPerson}</td>
                <td>${c.contactNumber}</td>
                <td class="table-actions">
                    <button class="btn btn-xs btn-info" onclick="editCenter('${c._id}')"><i class="fa fa-edit"></i> Edit</button>
                    <button class="btn btn-xs btn-danger" onclick="deleteCenter('${c._id}')"><i class="fa fa-trash"></i> Delete</button>
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

window.deleteCenter = async function(id) {
    if (confirm('Are you sure you want to delete this center?')) {
        try {
            const response = await fetch(`/api/centers/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                loadCenters();
            } else {
                alert('Failed to delete center: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting center:', error);
            alert('Error deleting center. Please try again.');
        }
    }
};

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
        const response = await fetch('/api/centers');
        const result = await response.json();
        if (result.success) {
            centers = result.data;
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

$(document).ready(loadCenters);

// Sign-out functionality
document.querySelector('.sign-out')?.addEventListener('click', async () => {
    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (currentUser) {
            // Clear user session
            localStorage.removeItem('currentUser');
        }
        
        // Redirect to login page
        window.location.replace('login.html');
    } catch (error) {
        console.error('Error during sign out:', error);
        alert('Error signing out. Please try again.');
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

