/**
 * Role Check Utility Script 
 * This can be used to verify user role in localStorage and test redirects
 */

(function() {
    // Check if there's a current user in localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        console.log('=== ROLE CHECK UTILITY ===');
        console.log('User data found in localStorage:');
        console.log('- Name:', currentUser.fullName);
        console.log('- Email:', currentUser.email);
        console.log('- Role:', currentUser.role);
        console.log('- ID:', currentUser.id);
        console.log('- Is Active:', currentUser.isActive);
        
        // Determine expected redirect
        let expectedRedirect;
        if (currentUser.role === 'superadmin') {
            expectedRedirect = 'admin-management.html';
        } else if (currentUser.role === 'admin') {
            expectedRedirect = 'admin_dashboard.html';
        } else {
            expectedRedirect = 'dashboard.html';
        }
        
        console.log('Expected redirect:', expectedRedirect);
        console.log('Current page:', window.location.pathname.split('/').pop());
        
        // Add a button to force the correct redirect
        const button = document.createElement('button');
        button.textContent = 'Go to correct page based on role';
        button.style.position = 'fixed';
        button.style.bottom = '20px';
        button.style.right = '20px';
        button.style.zIndex = '9999';
        button.style.padding = '10px';
        button.style.background = '#800000';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        
        button.addEventListener('click', function() {
            window.location.href = expectedRedirect;
        });
        
        document.body.appendChild(button);
    } else {
        console.log('No user data found in localStorage');
    }
})(); 