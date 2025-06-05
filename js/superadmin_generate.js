// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const signOutBtn = document.getElementById('signOutBtn');

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
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
        signOutBtn.addEventListener('click', handleSignOut);
    }

    // Attach event listeners to report forms
    const rabiesUtilizationForm = document.getElementById('rabiesUtilizationReportForm');
    if (rabiesUtilizationForm) {
        rabiesUtilizationForm.addEventListener('submit', handleRabiesUtilizationReport);
        rabiesUtilizationForm.querySelector('.btn-secondary').addEventListener('click', handlePrintRabiesUtilizationReport);
    }

    const animalBiteExposureForm = document.getElementById('animalBiteExposureReportForm');
    if (animalBiteExposureForm) {
        animalBiteExposureForm.addEventListener('submit', handleAnimalBiteExposureReport);
        animalBiteExposureForm.querySelector('.btn-secondary').addEventListener('click', handlePrintAnimalBiteExposureReport);
    }

    const rabiesRegistryForm = document.getElementById('rabiesRegistryReportForm');
    if (rabiesRegistryForm) {
        rabiesRegistryForm.addEventListener('submit', handleRabiesRegistryReport);
        rabiesRegistryForm.querySelector('.btn-secondary').addEventListener('click', handlePrintRabiesRegistryReport);
    }

    const customDemographicForm = document.getElementById('customDemographicReportForm');
    if (customDemographicForm) {
        customDemographicForm.addEventListener('submit', handleCustomDemographicReport);
        customDemographicForm.querySelector('.btn-secondary').addEventListener('click', handlePrintCustomDemographicReport);
    }
});

// Error Handler
function handleError(error) {
    console.error('Error:', error);
    hideLoading();
    alert('An error occurred while generating the report. Please try again.');
}

// Format date helper
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

// Rabies Registry Report Handler
async function handleRabiesRegistryReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/rabies-registry');
        if (!response.ok) throw new Error('Failed to fetch rabies registry data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateRabiesRegistryPDF(result.data);
    } catch (error) {
        handleError(error);
    }
}

// Animal Bite Exposure Report Handler
async function handleAnimalBiteExposureReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/animal-bite-exposure');
        if (!response.ok) throw new Error('Failed to fetch animal bite exposure data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateAnimalBiteExposurePDF(result.data);
    } catch (error) {
        handleError(error);
    }
}

// Rabies Utilization Report Handler
async function handleRabiesUtilizationReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/rabies-utilization');
        if (!response.ok) throw new Error('Failed to fetch rabies utilization data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateRabiesUtilizationPDF(result.data);
    } catch (error) {
        handleError(error);
    }
}

// Custom Demographic Report Handler
async function handleCustomDemographicReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const sex = document.getElementById('filterSex').value;
        const ageGroup = document.getElementById('filterAge').value;
        
        const response = await fetch(`/api/reports/demographic?sex=${sex}&ageGroup=${ageGroup}`);
        if (!response.ok) throw new Error('Failed to fetch demographic data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateCustomDemographicPDF(result.data, sex, ageGroup);
    } catch (error) {
        handleError(error);
    }
}

// Print Handlers
async function handlePrintRabiesUtilizationReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/rabies-utilization');
        if (!response.ok) throw new Error('Failed to fetch rabies utilization data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        printRabiesUtilizationReport(result.data);
    } catch (error) {
        handleError(error);
    }
}

async function handlePrintAnimalBiteExposureReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/animal-bite-exposure');
        if (!response.ok) throw new Error('Failed to fetch animal bite exposure data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        printAnimalBiteExposureReport(result.data);
    } catch (error) {
        handleError(error);
    }
}

async function handlePrintRabiesRegistryReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/rabies-registry');
        if (!response.ok) throw new Error('Failed to fetch rabies registry data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        printRabiesRegistryReport(result.data);
    } catch (error) {
        handleError(error);
    }
}

async function handlePrintCustomDemographicReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const sex = document.getElementById('filterSex').value;
        const ageGroup = document.getElementById('filterAge').value;
        
        const response = await fetch(`/api/reports/demographic?sex=${sex}&ageGroup=${ageGroup}`);
        if (!response.ok) throw new Error('Failed to fetch demographic data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        printCustomDemographicReport(result.data, sex, ageGroup);
    } catch (error) {
        handleError(error);
    }
}

// PDF Generation Functions
function generateRabiesRegistryPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('National Rabies Prevention & Control Program', 148, 12, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Rabies Exposure Registry', 148, 20, { align: 'center' });
    
    // Add table
    doc.autoTable({
        startY: 30,
        head: [['Reg. No.', 'Date', 'Name', 'Contact', 'Address', 'Age', 'Sex', 'Exposure Date', 'Animal Type', 'Bite Type']],
        body: data.map(row => [
            row.registrationNo || '',
            formatDate(row.registrationDate),
            `${row.lastName || ''}, ${row.firstName || ''}`,
            row.contactNo || '',
            row.address || '',
            row.age || '',
            row.sex || '',
            formatDate(row.exposureDate),
            row.animalType || '',
            row.biteType || ''
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid'
    });

    // Save the PDF
    doc.save('rabies-registry-report.pdf');
    hideLoading();
}

function generateAnimalBiteExposurePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('Animal Bite Exposure Report', 148, 12, { align: 'center' });
    
    // Add table
    doc.autoTable({
        startY: 20,
        head: [['Case No.', 'Date', 'Patient Name', 'Age', 'Sex', 'Address', 'Animal Type', 'Bite Site', 'Status']],
        body: data.map(row => [
            row.caseNo || '',
            formatDate(row.date),
            `${row.lastName || ''}, ${row.firstName || ''}`,
            row.age || '',
            row.sex || '',
            row.address || '',
            row.animalType || '',
            row.biteSite || '',
            row.status || ''
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid'
    });

    // Save the PDF
    doc.save('animal-bite-exposure-report.pdf');
    hideLoading();
}

function generateRabiesUtilizationPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('Rabies Vaccine Utilization Report', 148, 12, { align: 'center' });
    
    // Add table
    doc.autoTable({
        startY: 20,
        head: [['Date', 'Vaccine Type', 'Batch No.', 'Quantity Used', 'Remaining Stock', 'Expiry Date']],
        body: data.map(row => [
            formatDate(row.date),
            row.vaccineType || '',
            row.batchNo || '',
            row.quantityUsed || '',
            row.remainingStock || '',
            formatDate(row.expiryDate)
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid'
    });

    // Save the PDF
    doc.save('rabies-utilization-report.pdf');
    hideLoading();
}

function generateCustomDemographicPDF(data, sex, ageGroup) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Add content to PDF
    doc.setFontSize(16);
    doc.text('Custom Demographic Report', 148, 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Filter: Sex = ${sex}, Age Group = ${ageGroup}`, 148, 20, { align: 'center' });
    
    // Add table
    doc.autoTable({
        startY: 30,
        head: [['Name', 'Age', 'Sex', 'Address', 'Contact', 'Registration Date']],
        body: data.map(row => [
            `${row.lastName || ''}, ${row.firstName || ''}`,
            row.age || '',
            row.sex || '',
            row.address || '',
            row.contactNo || '',
            formatDate(row.registrationDate)
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid'
    });

    // Save the PDF
    doc.save('demographic-report.pdf');
    hideLoading();
}

// Print Functions
function printRabiesUtilizationReport(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    generateRabiesUtilizationPDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    hideLoading();
}

function printAnimalBiteExposureReport(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    generateAnimalBiteExposurePDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    hideLoading();
}

function printRabiesRegistryReport(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    generateRabiesRegistryPDF(data);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    hideLoading();
}

function printCustomDemographicReport(data, sex, ageGroup) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    generateCustomDemographicPDF(data, sex, ageGroup);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
    hideLoading();
}

// Sign Out Handler
function handleSignOut() {
    const signoutModal = document.getElementById('signoutModal');
    const cancelSignout = document.getElementById('cancelSignout');
    const confirmSignout = document.getElementById('confirmSignout');

    signoutModal.style.display = 'flex';

    cancelSignout.onclick = function() {
        signoutModal.style.display = 'none';
    };

    confirmSignout.onclick = function() {
        // Clear session/local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = 'index.html';
    };
}
