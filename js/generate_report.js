// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const signOutBtn = document.getElementById('signOutBtn');

// Rabies Utilization Table Preview Logic
const rabiesUtilFrom = document.getElementById('rabiesUtilFrom');
const rabiesUtilTo = document.getElementById('rabiesUtilTo');
const rabiesUtilTableBody = document.querySelector('#rabiesUtilTable tbody');
const rabiesUtilExportBtn = document.getElementById('rabiesUtilExportBtn');
let rabiesUtilRawData = [];

// Rabies Utilization Table Columns (cases per center)
const rabiesUtilColumns = [
    { title: 'Date', key: 'date' },
    { title: 'Center', key: 'center' },
    { title: 'Patient Name', key: 'patientName' },
    { title: 'Vaccine Used', key: 'vaccine' }
];

// --- Animal Bite Exposure Table Logic ---
const animalBiteFrom = document.getElementById('animalBiteFrom');
const animalBiteTo = document.getElementById('animalBiteTo');
const animalBiteTableBody = document.querySelector('#animalBiteTable tbody');
const animalBiteExportBtn = document.getElementById('animalBiteExportBtn');
let animalBiteRawData = [];

// --- Custom Demographic Table Logic ---
const customDemoFrom = document.getElementById('customDemoFrom');
const customDemoTo = document.getElementById('customDemoTo');
const filterSex = document.getElementById('filterSex');
const filterAge = document.getElementById('filterAge');
const customDemoTableBody = document.querySelector('#customDemoTable tbody');
const customDemoExportBtn = document.getElementById('customDemoExportBtn');
let customDemoRawData = [];

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

    loadRabiesUtilTable();
    loadAnimalBiteTable();
    loadCustomDemoTable();
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

// Rabies Utilization Table Preview Logic
async function loadRabiesUtilTable() {
    try {
        showLoading();
        const response = await fetch('/api/reports/rabies-utilization');
        if (!response.ok) throw new Error('Failed to fetch rabies utilization data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        rabiesUtilRawData = Array.isArray(result.data) ? result.data : (result.data.table?.body || []);
        renderRabiesUtilTable();
    } catch (error) {
        rabiesUtilTableBody.innerHTML = `<tr><td colspan="${rabiesUtilColumns.length}">No data found</td></tr>`;
    }
    hideLoading();
}

function aggregateRabiesUtilData(rawData) {
    return rawData.map(row => ({
        date: row.dateRegistered ? formatDate(row.dateRegistered) : '',
        center: row.center || '',
        patientName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        vaccine: row.brandName || row.genericName || ''
    }));
}

function renderRabiesUtilTable() {
    if (!rabiesUtilTableBody) return;
    const from = rabiesUtilFrom.value ? new Date(rabiesUtilFrom.value) : null;
    const to = rabiesUtilTo.value ? new Date(rabiesUtilTo.value) : null;
    const search = document.getElementById('rabiesUtilSearch')?.value?.toLowerCase() || '';
    let filtered = rabiesUtilRawData;
    if (from) filtered = filtered.filter(row => {
        const d = row.dateRegistered ? new Date(row.dateRegistered) : null;
        return d && d >= from;
    });
    if (to) filtered = filtered.filter(row => {
        const d = row.dateRegistered ? new Date(row.dateRegistered) : null;
        return d && d <= to;
    });
    if (search) {
        filtered = filtered.filter(row => {
            return (
                (row.dateRegistered && formatDate(row.dateRegistered).toLowerCase().includes(search)) ||
                (row.center && row.center.toLowerCase().includes(search)) ||
                ([row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ').toLowerCase().includes(search)) ||
                (row.brandName && row.brandName.toLowerCase().includes(search)) ||
                (row.genericName && row.genericName.toLowerCase().includes(search))
            );
        });
    }
    const mapped = aggregateRabiesUtilData(filtered);
    if (!mapped.length) {
        rabiesUtilTableBody.innerHTML = `<tr><td colspan="${rabiesUtilColumns.length}">No data found</td></tr>`;
        return;
    }
    rabiesUtilTableBody.innerHTML = mapped.map(row => `
        <tr>
            <td>${row.date}</td>
            <td>${row.center}</td>
            <td>${row.patientName}</td>
            <td>${row.vaccine}</td>
        </tr>
    `).join('');
}

const rabiesUtilSearch = document.getElementById('rabiesUtilSearch');
if (rabiesUtilSearch) rabiesUtilSearch.addEventListener('input', renderRabiesUtilTable);

if (rabiesUtilFrom) rabiesUtilFrom.addEventListener('change', renderRabiesUtilTable);
if (rabiesUtilTo) rabiesUtilTo.addEventListener('change', renderRabiesUtilTable);
if (rabiesUtilExportBtn) rabiesUtilExportBtn.addEventListener('click', function() {
    exportRabiesUtilPDF();
});

function exportRabiesUtilPDF() {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) {
        alert('jsPDF library not loaded.');
        return;
    }
    const doc = new jsPDF('landscape');
    const from = rabiesUtilFrom.value ? new Date(rabiesUtilFrom.value) : null;
    const to = rabiesUtilTo.value ? new Date(rabiesUtilTo.value) : null;
    let filtered = rabiesUtilRawData;
    if (from) filtered = filtered.filter(row => {
        const d = row.dateRegistered ? new Date(row.dateRegistered) : null;
        return d && d >= from;
    });
    if (to) filtered = filtered.filter(row => {
        const d = row.dateRegistered ? new Date(row.dateRegistered) : null;
        return d && d <= to;
    });
    const mapped = aggregateRabiesUtilData(filtered);
    const columns = rabiesUtilColumns.map(col => col.title);
    const rows = mapped.map(row => rabiesUtilColumns.map(col => row[col.key]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('CASES PER CENTER AND VACCINE USED', 14, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Date Range: ' + (rabiesUtilFrom.value || '...') + ' to ' + (rabiesUtilTo.value || '...'), 14, 22);
    doc.autoTable({
        head: [columns],
        body: rows,
        startY: 28,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });
    doc.save(`cases_per_center_${new Date().toISOString().split('T')[0]}.pdf`);
}

// --- Animal Bite Exposure Table Logic ---
async function loadAnimalBiteTable() {
    try {
        showLoading();
        const response = await fetch('/api/reports/animal-bite-exposure');
        if (!response.ok) throw new Error('Failed to fetch animal bite exposure data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        animalBiteRawData = Array.isArray(result.data) ? result.data : (result.data.table?.body || []);
        renderAnimalBiteTable();
    } catch (error) {
        animalBiteTableBody.innerHTML = `<tr><td colspan="9" style="color:#c00;">Error loading data</td></tr>`;
    }
    hideLoading();
}

function renderAnimalBiteTable() {
    if (!animalBiteTableBody) return;
    const from = animalBiteFrom.value ? new Date(animalBiteFrom.value) : null;
    const to = animalBiteTo.value ? new Date(animalBiteTo.value) : null;
    const search = document.getElementById('animalBiteSearch')?.value?.toLowerCase() || '';
    let filtered = animalBiteRawData;
    if (from) filtered = filtered.filter(row => row.date && new Date(row.date) >= from);
    if (to) filtered = filtered.filter(row => row.date && new Date(row.date) <= to);
    if (search) {
        filtered = filtered.filter(row => {
            return (
                (row.caseNo && row.caseNo.toLowerCase().includes(search)) ||
                (row.date && formatDate(row.date).toLowerCase().includes(search)) ||
                (row.name && row.name.toLowerCase().includes(search)) ||
                (row.patientName && row.patientName.toLowerCase().includes(search)) ||
                (row.age && String(row.age).toLowerCase().includes(search)) ||
                (row.sex && row.sex.toLowerCase().includes(search)) ||
                (row.address && row.address.toLowerCase().includes(search)) ||
                (row.animalType && row.animalType.toLowerCase().includes(search)) ||
                (row.biteSite && row.biteSite.toLowerCase().includes(search)) ||
                (row.status && row.status.toLowerCase().includes(search))
            );
        });
    }
    if (!filtered.length) {
        animalBiteTableBody.innerHTML = `<tr><td colspan="9">No data found</td></tr>`;
        return;
    }
    animalBiteTableBody.innerHTML = filtered.map(row => `
        <tr>
            <td>${row.caseNo || ''}</td>
            <td>${row.date ? formatDate(row.date) : ''}</td>
            <td>${row.name || row.patientName || ''}</td>
            <td>${row.age || ''}</td>
            <td>${row.sex || ''}</td>
            <td>${row.address || ''}</td>
            <td>${row.animalType || ''}</td>
            <td>${row.biteSite || ''}</td>
            <td>${row.status || ''}</td>
        </tr>
    `).join('');
}

const animalBiteSearch = document.getElementById('animalBiteSearch');
if (animalBiteSearch) animalBiteSearch.addEventListener('input', renderAnimalBiteTable);

if (animalBiteFrom) animalBiteFrom.addEventListener('change', renderAnimalBiteTable);
if (animalBiteTo) animalBiteTo.addEventListener('change', renderAnimalBiteTable);
if (animalBiteExportBtn) animalBiteExportBtn.addEventListener('click', function() {
    exportAnimalBitePDF();
});

function exportAnimalBitePDF() {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) {
        alert('jsPDF library not loaded.');
        return;
    }
    const doc = new jsPDF();
    const columns = ['Case No.', 'Date', 'Patient Name', 'Age', 'Sex', 'Address', 'Animal Type', 'Bite Site', 'Status'];
    const from = animalBiteFrom.value ? new Date(animalBiteFrom.value) : null;
    const to = animalBiteTo.value ? new Date(animalBiteTo.value) : null;
    let filtered = animalBiteRawData;
    if (from) filtered = filtered.filter(row => row.date && new Date(row.date) >= from);
    if (to) filtered = filtered.filter(row => row.date && new Date(row.date) <= to);
    const rows = filtered.map(row => [
        row.caseNo || '',
        row.date ? formatDate(row.date) : '',
        row.name || row.patientName || '',
        row.age || '',
        row.sex || '',
        row.address || '',
        row.animalType || '',
        row.biteSite || '',
        row.status || ''
    ]);
    doc.text('Animal Bite Exposure Report', 14, 16);
    doc.autoTable({
        head: [columns],
        body: rows,
        startY: 22,
        styles: { font: 'poppins', fontSize: 10 },
        headStyles: { fillColor: [128, 0, 0] },
        margin: { left: 14, right: 14 }
    });
    doc.save(`animal_bite_exposure_${new Date().toISOString().split('T')[0]}.pdf`);
}

// --- Custom Demographic Table Logic ---
async function loadCustomDemoTable() {
    try {
        showLoading();
        const sex = filterSex.value;
        const ageGroup = filterAge.value;
        const response = await fetch(`/api/reports/demographic?sex=${sex}&ageGroup=${ageGroup}`);
        if (!response.ok) throw new Error('Failed to fetch demographic data');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        customDemoRawData = Array.isArray(result.data) ? result.data : (result.data.table?.body || []);
        renderCustomDemoTable();
    } catch (error) {
        customDemoTableBody.innerHTML = `<tr><td colspan="6" style="color:#c00;">Error loading data</td></tr>`;
    }
    hideLoading();
}

function renderCustomDemoTable() {
    if (!customDemoTableBody) return;
    const from = customDemoFrom.value ? new Date(customDemoFrom.value) : null;
    const to = customDemoTo.value ? new Date(customDemoTo.value) : null;
    const sex = filterSex.value;
    const ageGroup = filterAge.value;
    const search = document.getElementById('customDemoSearch')?.value?.toLowerCase() || '';
    let filtered = customDemoRawData;
    if (from) filtered = filtered.filter(row => row.registrationDate && new Date(row.registrationDate) >= from);
    if (to) filtered = filtered.filter(row => row.registrationDate && new Date(row.registrationDate) <= to);
    if (sex && sex !== 'all') filtered = filtered.filter(row => row.sex && row.sex === sex);
    if (ageGroup && ageGroup !== 'all') {
        filtered = filtered.filter(row => {
            const age = Number(row.age);
            if (isNaN(age)) return false;
            if (ageGroup === '0-5') return age >= 0 && age <= 5;
            if (ageGroup === '6-12') return age >= 6 && age <= 12;
            if (ageGroup === '13-18') return age >= 13 && age <= 18;
            if (ageGroup === '19-35') return age >= 19 && age <= 35;
            if (ageGroup === '36-60') return age >= 36 && age <= 60;
            if (ageGroup === '61+') return age >= 61;
            return true;
        });
    }
    if (search) {
        filtered = filtered.filter(row => {
            return (
                ([row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ').toLowerCase().includes(search)) ||
                (row.name && row.name.toLowerCase().includes(search)) ||
                (row.age && String(row.age).toLowerCase().includes(search)) ||
                (row.sex && row.sex.toLowerCase().includes(search)) ||
                (row.address && row.address.toLowerCase().includes(search)) ||
                (row.contactNo && row.contactNo.toLowerCase().includes(search)) ||
                (row.registrationDate && formatDate(row.registrationDate).toLowerCase().includes(search))
            );
        });
    }
    if (!filtered.length) {
        customDemoTableBody.innerHTML = `<tr><td colspan="6">No data found</td></tr>`;
        return;
    }
    customDemoTableBody.innerHTML = filtered.map(row => `
        <tr>
            <td>${[row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || ''}</td>
            <td>${row.age || ''}</td>
            <td>${row.sex || ''}</td>
            <td>${row.address || ''}</td>
            <td>${row.contactNo || ''}</td>
            <td>${row.registrationDate ? formatDate(row.registrationDate) : ''}</td>
        </tr>
    `).join('');
}

const customDemoSearch = document.getElementById('customDemoSearch');
if (customDemoSearch) customDemoSearch.addEventListener('input', renderCustomDemoTable);

if (customDemoFrom) customDemoFrom.addEventListener('change', renderCustomDemoTable);
if (customDemoTo) customDemoTo.addEventListener('change', renderCustomDemoTable);
if (filterSex) filterSex.addEventListener('change', function() { loadCustomDemoTable(); });
if (filterAge) filterAge.addEventListener('change', function() { renderCustomDemoTable(); });
if (customDemoExportBtn) customDemoExportBtn.addEventListener('click', function() {
    exportCustomDemoPDF();
});

function exportCustomDemoPDF() {
    const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDF) {
        alert('jsPDF library not loaded.');
        return;
    }
    const doc = new jsPDF();
    const columns = ['Name', 'Age', 'Sex', 'Address', 'Contact', 'Registration Date'];
    const from = customDemoFrom.value ? new Date(customDemoFrom.value) : null;
    const to = customDemoTo.value ? new Date(customDemoTo.value) : null;
    const sex = filterSex.value;
    const ageGroup = filterAge.value;
    let filtered = customDemoRawData;
    if (from) filtered = filtered.filter(row => row.registrationDate && new Date(row.registrationDate) >= from);
    if (to) filtered = filtered.filter(row => row.registrationDate && new Date(row.registrationDate) <= to);
    if (sex && sex !== 'all') filtered = filtered.filter(row => row.sex && row.sex === sex);
    if (ageGroup && ageGroup !== 'all') {
        filtered = filtered.filter(row => {
            const age = Number(row.age);
            if (isNaN(age)) return false;
            if (ageGroup === '0-5') return age >= 0 && age <= 5;
            if (ageGroup === '6-12') return age >= 6 && age <= 12;
            if (ageGroup === '13-18') return age >= 13 && age <= 18;
            if (ageGroup === '19-35') return age >= 19 && age <= 35;
            if (ageGroup === '36-60') return age >= 36 && age <= 60;
            if (ageGroup === '61+') return age >= 61;
            return true;
        });
    }
    const rows = filtered.map(row => [
        [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || row.name || '',
        row.age || '',
        row.sex || '',
        row.address || '',
        row.contactNo || '',
        row.registrationDate ? formatDate(row.registrationDate) : ''
    ]);
    doc.text('Custom Demographic Report', 14, 16);
    doc.autoTable({
        head: [columns],
        body: rows,
        startY: 22,
        styles: { font: 'poppins', fontSize: 10 },
        headStyles: { fillColor: [128, 0, 0] },
        margin: { left: 14, right: 14 }
    });
    doc.save(`demographic_report_${new Date().toISOString().split('T')[0]}.pdf`);
}
