document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const profileForm = document.getElementById('profileForm');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toast = document.getElementById('toast');
    const passwordToggles = document.querySelectorAll('.toggle-password');
    const mainContent = document.querySelector('.main-content');

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.id) {
        // Redirect to login if no user data
        window.location.href = 'login.html';
        return;
    }

    // Check if user is admin or superadmin
    if (!['admin', 'superadmin'].includes(userData.role)) {
        // Redirect to dashboard if not admin/superadmin
        window.location.href = 'dashboard.html';
        return;
    }

    // Initialize user information
    document.getElementById('userFullName').textContent = userData.fullName;
    document.getElementById('userRole').textContent = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);

    // Load user profile data
    loadUserProfile();

    // Event Listeners
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


    // Functions
    async function loadUserProfile() {
        try {
            showLoading();
            const userId = userData.id;
            console.log('Loading profile for user ID:', userId);
            
            const response = await fetch(`/api/profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access - redirecting to login');
                    localStorage.removeItem('userData');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return;
                }
                const error = await response.json();
                throw new Error(error.message || 'Failed to fetch profile data');
            }

            const profile = await response.json();
            console.log('Profile data received:', profile);
            
            // Populate form fields
            document.getElementById('firstName').value = profile.firstName || '';
            document.getElementById('middleName').value = profile.middleName || '';
            document.getElementById('lastName').value = profile.lastName || '';
            document.getElementById('email').value = profile.email || '';
            document.getElementById('phoneNumber').value = profile.phoneNumber || '';
            if (profile.birthdate) {
                document.getElementById('birthdate').value = new Date(profile.birthdate).toISOString().split('T')[0];
            }
            
            // Update display name
            const fullName = `${profile.firstName || ''} ${profile.middleName ? profile.middleName + ' ' : ''}${profile.lastName || ''}`.trim();
            document.getElementById('userFullName').textContent = fullName || 'User';
            document.getElementById('userRole').textContent = profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Admin';
            
            hideLoading();
        } catch (error) {
            console.error('Error loading profile:', error);
            showError(error.message || 'Failed to load profile data. Please try again.');
            hideLoading();
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        try {
            showLoading();
            const formData = {
                firstName: document.getElementById('firstName').value,
                middleName: document.getElementById('middleName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phoneNumber: document.getElementById('phoneNumber').value,
                birthdate: document.getElementById('birthdate').value
            };

            // First update profile information
            const profileResponse = await fetch(`/api/profile/${userData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!profileResponse.ok) {
                const result = await profileResponse.json();
                throw new Error(result.message || 'Failed to update profile');
            }

            // Check if password fields are filled
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (currentPassword || newPassword || confirmPassword) {
                // Validate password fields
                if (!currentPassword) {
                    throw new Error('Current password is required to change password');
                }
                if (!newPassword) {
                    throw new Error('New password is required');
                }
                if (newPassword !== confirmPassword) {
                    throw new Error('New passwords do not match');
                }
                if (newPassword.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }

                // Update password
                const passwordResponse = await fetch(`/api/profile/${userData.id}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword
                    })
                });

                if (!passwordResponse.ok) {
                    const result = await passwordResponse.json();
                    throw new Error(result.message || 'Failed to update password');
                }
            }

            // Update local storage and display
            userData.firstName = formData.firstName;
            userData.middleName = formData.middleName;
            userData.lastName = formData.lastName;
            userData.email = formData.email;
            localStorage.setItem('userData', JSON.stringify(userData));
            
            const fullName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();
            document.getElementById('userFullName').textContent = fullName;

            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            showSuccess('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            showError(error.message || 'Failed to update profile');
        } finally {
            hideLoading();
        }
    }

    async function handleSignOut() {
        try {
            showLoading();
            const currentUser = userData;
            if (currentUser) {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        role: currentUser.role,
                        firstName: currentUser.firstName,
                        middleName: currentUser.middleName || '',
                        lastName: currentUser.lastName
                    })
                });
            }
            // Clear local storage and redirect to login
            localStorage.removeItem('userData');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error during logout:', error);
            showError('Failed to sign out');
            hideLoading();
        }
    }

    // Utility Functions
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    function showSuccess(message) {
        showToast(message, 'success');
    }

    function showError(message) {
        showToast(message, 'error');
    }

    function showToast(message, type = 'success') {
        if (toast) {
            toast.className = 'toast ' + type;
            const messageElement = toast.querySelector('.toast-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            toast.style.display = 'flex';
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }
});
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
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!currentUser) {
                throw new Error('No active session found');
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