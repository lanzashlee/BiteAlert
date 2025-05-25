// Function to toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    }
}

// Function to redirect based on role
function redirectBasedOnRole(role) {
    if (role === 'superadmin') {
        window.location.href = 'dashboard.html';
    } else if (role === 'admin') {
        window.location.href = 'admin_dashboard.html';
    }
}

// Check account status before redirecting
async function checkAccountStatus(email) {
    try {
        const response = await fetch(`/api/account-status/${email}`);
        const data = await response.json();
        
        if (data.success && data.account) {
            console.log('Account status check:', data.account);
            
            // If account is inactive, clear session and stay on login page
            if (data.account.isActive === false) {
                console.warn('Account is deactivated. Clearing session.');
                localStorage.removeItem('currentUser');
                const errorMessage = document.getElementById('errorMessage');
                errorMessage.textContent = 'Your account has been deactivated. Please contact a super admin.';
                errorMessage.style.display = 'block';
                return false;
            }
            
            // Update session with latest account data
            localStorage.setItem('currentUser', JSON.stringify(data.account));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking account status:', error);
        return false;
    }
}

// Initialize login functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Check for existing session and validate it
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.role) {
        try {
            // Verify if the session is still valid
            const response = await fetch('/api/verify-session', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Only redirect if the session is valid
                if (await checkAccountStatus(userData.email)) {
                    redirectBasedOnRole(userData.role);
                }
            } else {
                // Clear invalid session data
                localStorage.removeItem('userData');
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Error verifying session:', error);
            // Clear session data on error
            localStorage.removeItem('userData');
            localStorage.removeItem('token');
        }
    }

    // Handle login form submission
    document.getElementById('loginForm').addEventListener('submit', async function(event) {
        event.preventDefault();
    
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const overlay = document.querySelector('.loading-overlay');
        const errorMessage = document.getElementById('errorMessage');

        // Clear previous errors
        errorMessage.style.display = 'none';
            
        overlay.style.display = 'flex';
        
        try {
            // Try login
            console.log('Attempting login with:', email);
            
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Login response:', data);

            if (data.success) {
                // Store user data in localStorage
                localStorage.setItem('userData', JSON.stringify(data.user));
                localStorage.setItem('token', data.token || '');
                
                console.log('User role:', data.user.role);
                
                // Double-check account status before redirecting
                if (await checkAccountStatus(email)) {
                    // Redirect based on role
                    redirectBasedOnRole(data.user.role);
                } else {
                    overlay.style.display = 'none';
                }
            } else {
                // Show error message in the form
                errorMessage.textContent = data.message || 'Invalid email or password';
                errorMessage.style.display = 'block';
                overlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = 'An error occurred during login. Please make sure MongoDB is running (mongod).';
            errorMessage.style.display = 'block';
            overlay.style.display = 'none';
        }
    });
}); 