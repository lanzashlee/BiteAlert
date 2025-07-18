// Create Account Form Validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createAccountForm');
    const firstNameInput = document.getElementById('firstName');
    const middleNameInput = document.getElementById('middleName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const birthdateInput = document.getElementById('birthdate');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const roleSelect = document.getElementById('role');
    const submitButton = form.querySelector('button[type="submit"]');
    const passwordStrength = document.querySelector('.password-strength');
    const passwordRequirements = document.querySelector('.password-requirements');
    const requirementItems = document.querySelectorAll('.password-requirements li');

    // Password toggle functionality
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Clear validation on input
    const inputs = [firstNameInput, middleNameInput, lastNameInput, emailInput, 
                   phoneNumberInput, birthdateInput, passwordInput, confirmPasswordInput, roleSelect];
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Remove validation styling
            this.classList.remove('is-invalid', 'is-valid');
            const errorElement = this.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        });
    });

    // Password validation patterns
    const patterns = {
        length: /^.{8,}$/,
        uppercase: /[A-Z]/,
        special: /[!@#$%^&*(),.?":{}|<>]/
    };

    // Password validation
    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        let strength = 0;
        let requirementsMet = 0;

        // Update requirements list
        requirementItems.forEach(item => {
            item.classList.remove('valid');
        });

        // Check each requirement
        if (patterns.length.test(password)) {
            requirementItems[0].classList.add('valid');
            requirementsMet++;
            strength++;
        }
        if (patterns.uppercase.test(password)) {
            requirementItems[1].classList.add('valid');
            requirementsMet++;
            strength++;
        }
        if (patterns.special.test(password)) {
            requirementItems[2].classList.add('valid');
            requirementsMet++;
            strength++;
        }

        // Show/hide requirements
        if (password.length > 0) {
            passwordRequirements.style.display = 'block';
            passwordStrength.style.display = 'block';
        } else {
            passwordRequirements.style.display = 'none';
            passwordStrength.style.display = 'none';
            return;
        }

        // Update strength indicator
        passwordStrength.className = 'password-strength';
        if (strength <= 1) {
            passwordStrength.classList.add('weak');
            passwordStrength.textContent = 'Weak Password';
        } else if (strength <= 2) {
            passwordStrength.classList.add('medium');
            passwordStrength.textContent = 'Medium Password';
        } else {
            passwordStrength.classList.add('strong');
            passwordStrength.textContent = 'Strong Password';
        }
    });

    // Real-time full name uniqueness validation
    async function checkNameExists(firstName, middleName, lastName) {
        if (!firstName.trim() || !lastName.trim()) return false;
        const params = new URLSearchParams({
            firstName: firstName.trim(),
            middleName: (middleName || '').trim(),
            lastName: lastName.trim()
        });
        const res = await fetch(`/api/check-name-exists?${params.toString()}`);
        const data = await res.json();
        return data.exists;
    }

    async function handleNameInput() {
        const firstName = firstNameInput.value;
        const middleName = middleNameInput.value;
        const lastName = lastNameInput.value;
        if (firstName && lastName) {
            const exists = await checkNameExists(firstName, middleName, lastName);
            if (exists) {
                showError(firstNameInput, 'An account with this full name already exists.');
                showError(middleNameInput, 'An account with this full name already exists.');
                showError(lastNameInput, 'An account with this full name already exists.');
            } else {
                [firstNameInput, middleNameInput, lastNameInput].forEach(input => {
                    input.classList.remove('is-invalid');
                    const errorElement = input.parentElement.querySelector('.error-message');
                    if (errorElement) errorElement.style.display = 'none';
                });
            }
        }
    }

    [firstNameInput, middleNameInput, lastNameInput].forEach(input => {
        input.addEventListener('input', handleNameInput);
    });

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Reset all validation states
        inputs.forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
            const errorElement = input.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        });
        
        // Validate all fields
        let isValid = true;
        let firstError = null;

        // Required field validation
        inputs.forEach(input => {
            if (input.required && !input.value.trim()) {
                showError(input, 'This field is required');
                isValid = false;
                firstError = firstError || input;
            }
        });

        // Email validation
        if (emailInput.value.trim() && !validateEmailFormat(emailInput.value)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
            firstError = firstError || emailInput;
        }

        // Phone validation
        if (phoneNumberInput.value.trim() && !validatePhoneFormat(phoneNumberInput.value)) {
            showError(phoneNumberInput, 'Please enter a valid phone number (09XXXXXXXXX)');
            isValid = false;
            firstError = firstError || phoneNumberInput;
        }

        // Birthdate validation
        if (birthdateInput.value && !validateBirthdate(birthdateInput.value)) {
            showError(birthdateInput, 'You must be at least 18 years old');
            isValid = false;
            firstError = firstError || birthdateInput;
        }

        // Password validation
        const password = passwordInput.value;
        let passwordValid = true;
        
        if (!patterns.length.test(password)) passwordValid = false;
        if (!patterns.uppercase.test(password)) passwordValid = false;
        if (!patterns.special.test(password)) passwordValid = false;

        if (!passwordValid) {
            showError(passwordInput, 'Password must be at least 8 characters long, include an uppercase letter, and a special character');
            isValid = false;
            firstError = firstError || passwordInput;
        }

        // Confirm password validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            showError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
            firstError = firstError || confirmPasswordInput;
        }

        if (!isValid) {
            firstError.focus();
            return;
        }

        try {
            // Disable submit button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating Account...';

            const formData = {
                firstName: firstNameInput.value.trim(),
                middleName: middleNameInput.value.trim(),
                lastName: lastNameInput.value.trim(),
                email: emailInput.value.trim(),
                phoneNumber: phoneNumberInput.value.trim(),
                birthdate: birthdateInput.value,
                password: passwordInput.value,
                role: roleSelect.value
            };

            const response = await fetch('/api/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (data.success) {
                // Show the generated ID
                const idDisplayGroup = document.getElementById('idDisplayGroup');
                const generatedId = document.getElementById('generatedId');
                const id = data.user.role === 'superadmin' ? data.user.superAdminID : data.user.adminID;
                
                idDisplayGroup.style.display = 'block';
                generatedId.textContent = id;
                
                // Show success message with the generated ID
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success';
                alertDiv.innerHTML = `
                    <strong><i class="fa fa-check-circle"></i> Success!</strong> Account created successfully with ID: ${id}! Redirecting to dashboard...
                `;
                form.parentElement.insertBefore(alertDiv, form);

                // Clear form and reset states
                form.reset();
                if (passwordRequirements) passwordRequirements.style.display = 'none';
                if (passwordStrength) passwordStrength.style.display = 'none';

                // Redirect after delay
                setTimeout(() => {
                    window.location.href = 'admin-management.html';
                }, 2000);
            } else {
                // Show error message
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-danger';
                alertDiv.innerHTML = `
                    <strong><i class="fa fa-exclamation-circle"></i> Error!</strong> ${data.message || 'Failed to create account. Please try again.'}
                `;
                form.parentElement.insertBefore(alertDiv, form);

                // Show field-specific errors
                if (data.errors) {
                    Object.entries(data.errors).forEach(([field, message]) => {
                        if (message) {
                            const input = form.querySelector(`[name="${field}"]`);
                            if (input) showError(input, message);
                        }
                    });
                }

                // Check for name exists error (all three names match)
                if (data.errors && data.errors.nameExists) {
                    // Show a specific validation error for the name combination
                    showError(firstNameInput, 'An account with this full name already exists.');
                    showError(middleNameInput, 'An account with this full name already exists.');
                    showError(lastNameInput, 'An account with this full name already exists.');
                    firstNameInput.focus();
                    return;
                }
                // Fallback: if backend returns a message string
                if (data.message && data.message.toLowerCase().includes('already exists')) {
                    showError(firstNameInput, 'An account with this full name already exists.');
                    showError(middleNameInput, 'An account with this full name already exists.');
                    showError(lastNameInput, 'An account with this full name already exists.');
                    firstNameInput.focus();
                    return;
                }
            }
        } catch (error) {
            console.error('Error:', error);
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <strong><i class="fa fa-exclamation-circle"></i> Error!</strong> An unexpected error occurred. Please try again.
            `;
            form.parentElement.insertBefore(alertDiv, form);
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
        }
    });

    // Helper Functions
    function validateEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function validatePhoneFormat(phone) {
        const phoneRegex = /^09\d{9}$/;
        return phoneRegex.test(phone);
    }

    function validateBirthdate(birthdate) {
        if (!birthdate) return false;
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age >= 18;
    }

    function showError(input, message) {
        input.classList.add('is-invalid');
        const errorElement = input.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    // Menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }
});
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
