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

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('RABIES EXPOSURE REGISTRY', 14, 24);
    doc.setFontSize(10);
    doc.text(data.monthYear || new Date().toLocaleDateString(), 14, 30);

    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Reg. No.', 'Date', 'Name', 'Contact', 'Address', 'Age', 'Sex', 'Exposure Date', 'Animal Type', 'Bite Type'];

    // Table
    doc.autoTable({
        startY: 36,
        head: [headers],
        body: tableData.map(row => [
            row.registrationNo || '',
            formatDate(row.registrationDate),
            [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || '',
            row.contactNo || '',
            row.address || '',
            row.age || '',
            row.sex || '',
            formatDate(row.exposureDate),
            row.animalType || '',
            row.biteType || ''
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });

    // Prepared by
    const y = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy || '', 35, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle || '', 35, y + 6);

    // Save the PDF
    doc.save('rabies-registry-report.pdf');
    hideLoading();
}

function generateAnimalBiteExposurePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('ANIMAL BITE EXPOSURE REPORT', 14, 24);
    doc.setFontSize(10);
    doc.text(data.monthYear || new Date().toLocaleDateString(), 14, 30);

    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Case No.', 'Date', 'Patient Name', 'Age', 'Sex', 'Address', 'Animal Type', 'Bite Site', 'Status'];

    // Table
    doc.autoTable({
        startY: 36,
        head: [headers],
        body: tableData.map(row => [
            row.caseNo || '',
            formatDate(row.date),
            row.name || row.patientName || '',
            row.age || '',
            row.sex || '',
            row.address || '',
            row.animalType || '',
            row.biteSite || '',
            row.status || ''
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });

    // Prepared by
    const y = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy || '', 35, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle || '', 35, y + 6);

    // Save the PDF
    doc.save('animal-bite-exposure-report.pdf');
    hideLoading();
}

function generateRabiesUtilizationPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('RABIES UTILIZATION REPORT', 14, 24);
    doc.setFontSize(10);
    doc.text(data.monthYear || new Date().toLocaleDateString(), 14, 30);

    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Date', 'Vaccine Type', 'Batch No.', 'Quantity Used', 'Remaining Stock', 'Expiry Date'];

    // Table
    doc.autoTable({
        startY: 36,
        head: [headers],
        body: tableData.map(row => [
            formatDate(row.date),
            row.vaccineType || '',
            row.batchNo || '',
            row.quantityUsed || '',
            row.remainingStock || '',
            formatDate(row.expiryDate)
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });

    // Prepared by
    const y = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy || '', 35, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle || '', 35, y + 6);

    // Save the PDF
    doc.save('rabies-utilization-report.pdf');
    hideLoading();
}

function generateCustomDemographicPDF(data, sex, ageGroup) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('CUSTOM DEMOGRAPHIC REPORT', 14, 24);
    doc.setFontSize(10);
    doc.text(`Filter: Sex = ${sex}, Age Group = ${ageGroup}`, 14, 30);
    doc.text(data.monthYear || new Date().toLocaleDateString(), 14, 36);

    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Name', 'Age', 'Sex', 'Address', 'Contact', 'Registration Date'];

    // Table
    doc.autoTable({
        startY: 42,
        head: [headers],
        body: tableData.map(row => [
            [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || '',
            row.age || '',
            row.sex || '',
            row.address || '',
            row.contactNo || '',
            formatDate(row.registrationDate)
        ]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });

    // Prepared by
    const y = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy || '', 35, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle || '', 35, y + 6);

    // Save the PDF
    doc.save('demographic-report.pdf');
    hideLoading();
}

// Print Functions
function printRabiesUtilizationReport(data) {
    const win = window.open('', '', 'width=1000,height=700');
    
    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Date', 'Vaccine Type', 'Batch No.', 'Quantity Used', 'Remaining Stock', 'Expiry Date'];

    let html = `
        <html>
        <head>
            <title>Rabies Utilization Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 14px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #800000; color: white; }
                .footer { margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}</div>
                <div class="subtitle">RABIES UTILIZATION REPORT</div>
                <div class="subtitle">${data.monthYear || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableData.map(row => `
                        <tr>
                            <td>${formatDate(row.date)}</td>
                            <td>${row.vaccineType || ''}</td>
                            <td>${row.batchNo || ''}</td>
                            <td>${row.quantityUsed || ''}</td>
                            <td>${row.remainingStock || ''}</td>
                            <td>${formatDate(row.expiryDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div>Prepared by: <strong>${data.preparedBy || ''}</strong></div>
                <div>${data.preparedByTitle || ''}</div>
            </div>
        </body>
        </html>
    `;

    win.document.write(html);
    win.document.close();
    
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
    
    hideLoading();
}

function printAnimalBiteExposureReport(data) {
    const win = window.open('', '', 'width=1000,height=700');
    
    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Case No.', 'Date', 'Patient Name', 'Age', 'Sex', 'Address', 'Animal Type', 'Bite Site', 'Status'];

    let html = `
        <html>
        <head>
            <title>Animal Bite Exposure Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 14px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #800000; color: white; }
                .footer { margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}</div>
                <div class="subtitle">ANIMAL BITE EXPOSURE REPORT</div>
                <div class="subtitle">${data.monthYear || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableData.map(row => `
                        <tr>
                            <td>${row.caseNo || ''}</td>
                            <td>${formatDate(row.date)}</td>
                            <td>${row.name || row.patientName || ''}</td>
                            <td>${row.age || ''}</td>
                            <td>${row.sex || ''}</td>
                            <td>${row.address || ''}</td>
                            <td>${row.animalType || ''}</td>
                            <td>${row.biteSite || ''}</td>
                            <td>${row.status || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div>Prepared by: <strong>${data.preparedBy || ''}</strong></div>
                <div>${data.preparedByTitle || ''}</div>
            </div>
        </body>
        </html>
    `;

    win.document.write(html);
    win.document.close();
    
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
    
    hideLoading();
}

function printRabiesRegistryReport(data) {
    const win = window.open('', '', 'width=1000,height=700');
    
    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Reg. No.', 'Date', 'Name', 'Contact', 'Address', 'Age', 'Sex', 'Exposure Date', 'Animal Type', 'Bite Type'];

    let html = `
        <html>
        <head>
            <title>Rabies Exposure Registry</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 14px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #800000; color: white; }
                .footer { margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}</div>
                <div class="subtitle">RABIES EXPOSURE REGISTRY</div>
                <div class="subtitle">${data.monthYear || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableData.map(row => `
                        <tr>
                            <td>${row.registrationNo || ''}</td>
                            <td>${formatDate(row.registrationDate)}</td>
                            <td>${[row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || ''}</td>
                            <td>${row.contactNo || ''}</td>
                            <td>${row.address || ''}</td>
                            <td>${row.age || ''}</td>
                            <td>${row.sex || ''}</td>
                            <td>${formatDate(row.exposureDate)}</td>
                            <td>${row.animalType || ''}</td>
                            <td>${row.biteType || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div>Prepared by: <strong>${data.preparedBy || ''}</strong></div>
                <div>${data.preparedByTitle || ''}</div>
            </div>
        </body>
        </html>
    `;

    win.document.write(html);
    win.document.close();
    
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
    
    hideLoading();
}

function printCustomDemographicReport(data, sex, ageGroup) {
    const win = window.open('', '', 'width=1000,height=700');
    
    // Ensure data is in the correct format
    const tableData = Array.isArray(data) ? data : (data.table?.body || []);
    const headers = data.table?.head || ['Name', 'Age', 'Sex', 'Address', 'Contact', 'Registration Date'];

    let html = `
        <html>
        <head>
            <title>Custom Demographic Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 14px; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #800000; color: white; }
                .footer { margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">NAME OF FACILITY: ${data.facilityName || 'Animal Bite Treatment Center'}</div>
                <div class="subtitle">CUSTOM DEMOGRAPHIC REPORT</div>
                <div class="subtitle">Filter: Sex = ${sex}, Age Group = ${ageGroup}</div>
                <div class="subtitle">${data.monthYear || new Date().toLocaleDateString()}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableData.map(row => `
                        <tr>
                            <td>${[row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || ''}</td>
                            <td>${row.age || ''}</td>
                            <td>${row.sex || ''}</td>
                            <td>${row.address || ''}</td>
                            <td>${row.contactNo || ''}</td>
                            <td>${formatDate(row.registrationDate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div>Prepared by: <strong>${data.preparedBy || ''}</strong></div>
                <div>${data.preparedByTitle || ''}</div>
            </div>
        </body>
        </html>
    `;

    win.document.write(html);
    win.document.close();
    
        setTimeout(() => {
        win.print();
        win.close();
    }, 500);
    
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
