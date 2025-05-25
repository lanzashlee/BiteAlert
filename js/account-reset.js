/**
 * Account Status Reset Utility
 */

// Check current account status
async function checkMyStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.log('No user currently logged in');
        return null;
    }
    
    console.log('Current user session:');
    console.log('- Email:', currentUser.email);
    console.log('- Role:', currentUser.role);
    console.log('- Active:', currentUser.isActive);
    
    try {
        const response = await fetch(`/api/account-status/${currentUser.email}`);
        const data = await response.json();
        
        if (data.success && data.account) {
            console.log('Server account status:');
            console.log('- Email:', data.account.email);
            console.log('- Role:', data.account.role);
            console.log('- Active:', data.account.isActive);
            
            return data.account;
        } else {
            console.log('Failed to fetch account status from server');
            return null;
        }
    } catch (error) {
        console.error('Error checking account status:', error);
        return null;
    }
}

// Clear current session
function clearSession() {
    localStorage.removeItem('currentUser');
    console.log('User session cleared');
    return true;
} 