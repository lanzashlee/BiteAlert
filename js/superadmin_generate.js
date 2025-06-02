// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');


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
}    // Load initial data
    // loadReportData();
    
     

    
    // Sign out functionality
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    } else {
        console.error('Sign out button not found');
    }

    // Attach event listeners to report forms
    const rabiesUtilizationForm = document.getElementById('rabiesUtilizationReportForm');
    if (rabiesUtilizationForm) {
        rabiesUtilizationForm.addEventListener('submit', handleRabiesUtilizationReport);
    }
    const animalBiteExposureForm = document.getElementById('animalBiteExposureReportForm');
    if (animalBiteExposureForm) {
        animalBiteExposureForm.addEventListener('submit', handleAnimalBiteExposureReport);
    }
    const rabiesRegistryForm = document.getElementById('rabiesRegistryReportForm');
    if (rabiesRegistryForm) {
        rabiesRegistryForm.addEventListener('submit', handleRabiesRegistryReport);
    }
    // --- Custom Demographic Report Handler ---
    document.getElementById('customDemographicReportForm').addEventListener('submit', handleCustomDemographicReport);

    document.getElementById('rabiesUtilizationReportForm').querySelector('.btn-secondary').addEventListener('click', handlePrintRabiesUtilizationReport);
    document.getElementById('animalBiteExposureReportForm').querySelector('.btn-secondary').addEventListener('click', handlePrintAnimalBiteExposureReport);
    document.getElementById('rabiesRegistryReportForm').querySelector('.btn-secondary').addEventListener('click', handlePrintRabiesRegistryReport);
    document.getElementById('customDemographicReportForm').querySelector('.btn-secondary').addEventListener('click', handlePrintCustomDemographicReport);
});

// Error Handler
function handleError(error) {
    console.error('Error:', error);
    alert('An error occurred while generating the report. Please try again.');
}

// Rabies Registry Report Handler
async function handleRabiesRegistryReport(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/reports/rabies-registry');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateRabiesRegistryPDF(result.data);
    } catch (error) {
        handleError(error);
    }
}

function generateRabiesRegistryPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    // --- PAGE 1: Rabies Exposure Registry ---
    doc.setFontSize(16);
    doc.text('National Rabies Prevention & Control Program', 148, 12, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Rabies Exposure Registry', 148, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Month/Year: ____________________', 14, 28);
    doc.autoTable({
        startY: 32,
        head: [[
            'Reg. No.', 'Date', 'Name (Last, First)', 'Contact No.', 'Address',
            'Date of Birth', 'Age', 'Sex', 'Exposure Date', 'Exposure Place',
            'Animal Type', 'Bite Type', 'Bite Site'
        ]],
        body: data.map(row => [
            row.registrationNo,
            row.registrationDate,
            row.name,
            row.contactNo,
            row.address,
            row.dateOfBirth,
            row.age,
            row.sex,
            row.exposureDate,
            row.exposurePlace,
            row.animalType,
            row.biteType,
            row.biteSite
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid',
        margin: { left: 8, right: 8 }
    });

    // --- SUMMARY TABLES ---
    let summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Summary by Sex', 14, summaryY);
    summaryY += 3;
    // Sex summary
    const sexCounts = {};
    data.forEach(row => {
        const sex = (row.sex || 'Unknown').toString().trim();
        sexCounts[sex] = (sexCounts[sex] || 0) + 1;
    });
    doc.autoTable({
        startY: summaryY,
        head: [['Sex', 'Count']],
        body: Object.entries(sexCounts),
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 14, right: 8 },
        tableWidth: 40
    });
    summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Summary by Age Group', 14, summaryY);
    summaryY += 3;
    // Age group summary
    const ageGroups = {
        '0-5': 0,
        '6-12': 0,
        '13-18': 0,
        '19-35': 0,
        '36-60': 0,
        '61+': 0,
        'Unknown': 0
    };
    data.forEach(row => {
        let age = parseInt(row.age);
        if (isNaN(age)) ageGroups['Unknown']++;
        else if (age <= 5) ageGroups['0-5']++;
        else if (age <= 12) ageGroups['6-12']++;
        else if (age <= 18) ageGroups['13-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 60) ageGroups['36-60']++;
        else ageGroups['61+']++;
    });
    doc.autoTable({
        startY: summaryY,
        head: [['Age Group', 'Count']],
        body: Object.entries(ageGroups),
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 14, right: 8 },
        tableWidth: 50
    });
    summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Summary by Date', 14, summaryY);
    summaryY += 3;
    // Date summary
    const dateCounts = {};
    data.forEach(row => {
        const date = (row.registrationDate || 'Unknown').toString().trim();
        dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    doc.autoTable({
        startY: summaryY,
        head: [['Date', 'Count']],
        body: Object.entries(dateCounts),
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 14, right: 8 },
        tableWidth: 60
    });

    // --- PAGE 2: Post-Exposure Treatment (PEP) Registry ---
    doc.addPage('landscape');
    doc.setFontSize(16);
    doc.text('National Rabies Prevention & Control Program', 148, 12, { align: 'center' });
    doc.setFontSize(13);
    doc.text('Post-Exposure Treatment (PEP) Registry', 148, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Month/Year: ____________________', 14, 28);
    doc.autoTable({
        startY: 32,
        head: [[
            'Category (I, II, III)',
            'Washing of Bite Site (Y/N)',
            'RIG Date Given',
            'Generic',
            'Brand',
            'Route',
            'D0',
            'D3',
            'D7',
            'D14',
            'D28',
            'Outcome (C/Inc/D/N)',
            'Status of Biting Animal (A/D/L)',
            'Weight',
            'TT Given (Y/N)',
            'Remarks'
        ]],
        body: data.map(row => [
            row.category || row.exposureCategory || '',
            typeof row.washingWound !== 'undefined' ? (row.washingWound ? 'Y' : 'N') : '',
            row.rigDate || row.rig || '',
            row.genericName || '',
            row.brandName || '',
            row.route || '',
            (row.scheduleDates && row.scheduleDates[0]) ? formatDate(row.scheduleDates[0]) : '',
            (row.scheduleDates && row.scheduleDates[1]) ? formatDate(row.scheduleDates[1]) : '',
            (row.scheduleDates && row.scheduleDates[2]) ? formatDate(row.scheduleDates[2]) : '',
            (row.scheduleDates && row.scheduleDates[3]) ? formatDate(row.scheduleDates[3]) : '',
            (row.scheduleDates && row.scheduleDates[4]) ? formatDate(row.scheduleDates[4]) : '',
            row.outcome || row.status || '',
            row.animalStatus || '',
            row.weight || '',
            typeof row.tt !== 'undefined' ? (row.tt ? 'Y' : 'N') : '',
            row.remarks || ''
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid',
        margin: { left: 8, right: 8 }
    });

    // Add Outcome and Status legends
    let legendY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9);
    doc.text('Outcome:', 10, legendY);
    doc.text('Completed (C) - Patient received at least Days 0, 3, and 7 doses', 25, legendY);
    legendY += 5;
    doc.text('Incomplete (Inc) - Patients who did not receive at least Days 0, 3, and 7', 25, legendY);
    legendY += 5;
    doc.text('Died (D) - Patients who died of whatsoever cause', 25, legendY);
    legendY += 5;
    doc.text('None (N) - Category III exposures who did not receive any of the TCV doses', 25, legendY);
    legendY += 7;
    doc.text('Status of Biting Animal:', 10, legendY);
    doc.text('A: Alive', 60, legendY);
    doc.text('D: Died', 90, legendY);
    doc.text('L: Lost, not available for 14 days observation', 120, legendY);

    // Add Summary of Bites table (blank)
    legendY += 10;
    doc.setFontSize(10);
    doc.text('Summary of Bites:', 10, legendY);
    legendY += 3;
    doc.autoTable({
        startY: legendY,
        head: [['Category', 'ARV', 'ERIG', 'HRIG', 'Total']],
        body: [
            ['1', '', '', '', ''],
            ['2', '', '', '', ''],
            ['3', '', '', '', '']
        ],
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 10, right: 8 },
        tableWidth: 70
    });
    legendY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text('Human Rabies', 10, legendY);
    doc.save('rabies-exposure-registry.pdf');
}

function formatDate(date) {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d)) return '';
        return d.toLocaleDateString();
    } catch {
        return '';
    }
}

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

// Handler for Animal Bite Exposure Report
async function handleAnimalBiteExposureReport(e) {
    e.preventDefault();
    try {
        // Fetch bitecases data
        const response = await fetch('/api/bitecases');
        const bitecases = await response.json();
        if (!Array.isArray(bitecases) && !Array.isArray(bitecases.data)) throw new Error('Failed to fetch bitecases');
        const cases = Array.isArray(bitecases) ? bitecases : bitecases.data;

        // Helper to format address
        function formatAddress(row) {
            // Join all address parts, filter out empty/null/undefined
            const parts = [row.houseNo, row.street, row.barangay, row.subdivision, row.city, row.province, row.zipCode];
            return parts.filter(part => part && part !== 'null' && part !== 'undefined').join(', ');
        }

        // Transform bitecases to the expected report format
        const reportData = {
            quarter: '', // You may want to calculate or prompt for this
            dateSubmitted: new Date().toLocaleDateString(),
            year: new Date().getFullYear(),
            facilityName: '', // Fill as needed
            lgu: '', // Fill as needed
            table: {
                head: [
                    'Reg. No.', 'Date', 'Name (Last, First)', 'Contact No.', 'Address',
                    'Date of Birth', 'Age', 'Sex', 'Exposure Date', 'Exposure Place',
                    'Animal Type', 'Bite Type', 'Bite Site'
                ],
                body: cases.map(row => [
                    row.registrationNumber || '',
                    row.dateRegistered || '',
                    ((row.lastName || '') + (row.firstName ? (', ' + row.firstName) : '')),
                    '', // Contact No. not present in sample
                    row.barangay || '', // Use barangay as Address (or change to full address if needed)
                    '', // Date of Birth not present in sample
                    row.age || '',
                    row.sex || '',
                    row.exposureDate || '',
                    row.exposurePlace || '',
                    row.exposureSource || '',
                    row.exposureType || '',
                    '' // Bite Site not present in sample
                ])
            },
            preparedBy: '', // Fill as needed
            preparedByTitle: '' // Fill as needed
        };
        generateAnimalBiteExposurePDF(reportData);
    } catch (error) {
        handleError(error);
    }
}

function generateAnimalBiteExposurePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    // --- HEADER BOX ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, 10, 277, 30, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Metro Manila Center for Health Development', 16, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('National Rabies Prevention and Control Program', 16, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Animal Bite Exposure Report Form', 16, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    // Right side fields
    doc.text('Quarter:', 180, 16);
    doc.text(`${data.quarter}`, 200, 16);
    doc.text('Category:', 220, 16);
    doc.text('ABTC: X   ABC: ___', 245, 16);
    doc.text('Date Submitted:', 180, 24);
    doc.text(data.dateSubmitted, 220, 24);
    doc.text('Year:', 180, 30);
    doc.text(`${data.year}`, 200, 30);

    // --- FACILITY/LGU FIELDS ---
    doc.setFont('helvetica', 'bold');
    doc.text('Name of Animal Bite Facility:', 14, 48);
    doc.setFont('helvetica', 'normal');
    doc.text(data.facilityName, 70, 48);
    doc.setFont('helvetica', 'bold');
    doc.text('Name of LGU:', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(data.lgu, 45, 55);

    // --- TABLE ---
    // Use autoTable for dynamic data
    doc.autoTable({
        startY: 65,
        head: [data.table.head],
        body: data.table.body,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [128, 0, 0], textColor: 255, fontStyle: 'bold' },
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });

    // Signature/Prepared by block
    const y = doc.lastAutoTable.finalY + 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy, 35, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle, 35, y + 6);
    doc.save('animal-bite-exposure-report.pdf');
}

// Handler for Rabies Utilization Report
async function handleRabiesUtilizationReport(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/reports/rabies-utilization');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateRabiesUtilizationPDF(result.data);
    } catch (error) {
        handleError(error);
    }
}

function generateRabiesUtilizationPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`NAME OF FACILITY: ${data.facilityName}`, 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('RABIES UTILIZATION REPORT', 14, 24);
    doc.setFontSize(10);
    doc.text(data.monthYear, 14, 30);
    // Table with color-coded columns
    doc.autoTable({
        startY: 36,
        head: [data.table.head],
        body: data.table.body,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: [
            { fillColor: [180, 210, 240] }, // blue
            { fillColor: [180, 210, 240] },
            { fillColor: [180, 210, 240] },
            { fillColor: [180, 210, 240] },
            { fillColor: [180, 210, 240] },
            { fillColor: [255, 204, 102] }, // orange
            { fillColor: [255, 204, 102] },
            { fillColor: [255, 255, 153] }, // yellow
        ],
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableLineColor: [128, 0, 0],
        tableLineWidth: 0.3
    });
    // Legend
    let legendY = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(180, 210, 240); doc.rect(14, legendY, 5, 5, 'F'); doc.text('VAXIRAB', 21, legendY + 4);
    doc.setFillColor(255, 204, 102); doc.rect(40, legendY, 5, 5, 'F'); doc.text('EQUIRAB', 47, legendY + 4);
    doc.setFillColor(255, 255, 153); doc.rect(70, legendY, 5, 5, 'F'); doc.text('ABH-TT/TCV', 77, legendY + 4);
    // Prepared by
    legendY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Prepared by:', 14, legendY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.preparedBy, 35, legendY);
    doc.setFont('helvetica', 'normal');
    doc.text(data.preparedByTitle, 35, legendY + 6);
    doc.save('rabies-utilization-report.pdf');
}

// Handler for Custom Demographic Report
async function handleCustomDemographicReport(e) {
    e.preventDefault();
    try {
        // Fetch registry data (reuse rabies registry endpoint)
        const response = await fetch('/api/reports/rabies-registry');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        let data = result.data;
        // Get filters
        const sex = document.getElementById('filterSex').value;
        const ageGroup = document.getElementById('filterAge').value;
        // Filter by sex
        if (sex !== 'all') {
            data = data.filter(row => (row.sex || '').toLowerCase() === sex.toLowerCase());
        }
        // Filter by age group
        if (ageGroup !== 'all') {
            data = data.filter(row => {
                let age = parseInt(row.age);
                if (isNaN(age)) return false;
                if (ageGroup === '0-5') return age >= 0 && age <= 5;
                if (ageGroup === '6-12') return age >= 6 && age <= 12;
                if (ageGroup === '13-18') return age >= 13 && age <= 18;
                if (ageGroup === '19-35') return age >= 19 && age <= 35;
                if (ageGroup === '36-60') return age >= 36 && age <= 60;
                if (ageGroup === '61+') return age >= 61;
                return false;
            });
        }
        generateCustomDemographicPDF(data, sex, ageGroup);
    } catch (error) {
        handleError(error);
    }
}

function generateCustomDemographicPDF(data, sex, ageGroup) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Custom Demographic Report', 148, 12, { align: 'center' });
    doc.setFontSize(11);
    let filterText = 'Filters: ';
    filterText += (sex === 'all') ? 'Sex: All' : `Sex: ${sex}`;
    filterText += ' | ';
    filterText += (ageGroup === 'all') ? 'Age: All' : `Age: ${ageGroup}`;
    doc.text(filterText, 14, 22);
    doc.setFontSize(10);
    doc.text('Generated: ' + new Date().toLocaleString(), 14, 28);
    // Table
    doc.autoTable({
        startY: 34,
        head: [[
            'Reg. No.', 'Date', 'Name (Last, First)', 'Sex', 'Age', 'Exposure Date', 'Animal Type', 'Bite Type', 'Bite Site'
        ]],
        body: data.map(row => [
            row.registrationNo,
            row.registrationDate,
            row.name,
            row.sex,
            row.age,
            row.exposureDate,
            row.animalType,
            row.biteType,
            row.biteSite
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [128, 0, 0] },
        theme: 'grid',
        margin: { left: 8, right: 8 }
    });
    // Summary
    let summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Summary by Sex', 14, summaryY);
    summaryY += 3;
    const sexCounts = {};
    data.forEach(row => {
        const s = (row.sex || 'Unknown').toString().trim();
        sexCounts[s] = (sexCounts[s] || 0) + 1;
    });
    doc.autoTable({
        startY: summaryY,
        head: [['Sex', 'Count']],
        body: Object.entries(sexCounts),
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 14, right: 8 },
        tableWidth: 40
    });
    summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Summary by Age Group', 14, summaryY);
    summaryY += 3;
    const ageGroups = {
        '0-5': 0,
        '6-12': 0,
        '13-18': 0,
        '19-35': 0,
        '36-60': 0,
        '61+': 0,
        'Unknown': 0
    };
    data.forEach(row => {
        let age = parseInt(row.age);
        if (isNaN(age)) ageGroups['Unknown']++;
        else if (age <= 5) ageGroups['0-5']++;
        else if (age <= 12) ageGroups['6-12']++;
        else if (age <= 18) ageGroups['13-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 60) ageGroups['36-60']++;
        else ageGroups['61+']++;
    });
    doc.autoTable({
        startY: summaryY,
        head: [['Age Group', 'Count']],
        body: Object.entries(ageGroups),
        styles: { fontSize: 9 },
        theme: 'grid',
        margin: { left: 14, right: 8 },
        tableWidth: 50
    });
    doc.save('custom-demographic-report.pdf');
}

async function handlePrintRabiesUtilizationReport(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/reports/rabies-utilization');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        const data = result.data;
        printRabiesUtilizationReport(data);
    } catch (error) {
        handleError(error);
    }
}

function printRabiesUtilizationReport(data) {
    let win = window.open('', '', 'width=1000,height=700');
    let html = `<div style='font-size:16px;font-weight:600;margin-bottom:8px;'>Rabies Utilization Report</div>`;
    html += `<div style='font-size:13px;margin-bottom:8px;'>Facility: ${data.facilityName || ''}</div>`;
    html += `<div style='font-size:12px;margin-bottom:12px;'>${data.monthYear || ''} | Generated: ${new Date().toLocaleString()}</div>`;
    // Table
    html += `<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;width:100%;font-size:12px;'>`;
    html += `<thead><tr style='background:#800000;color:#fff;'>` + data.table.head.map(h=>`<th>${h}</th>`).join('') + `</tr></thead><tbody>`;
    data.table.body.forEach(row => {
        html += `<tr>` + row.map(cell => `<td>${cell || ''}</td>`).join('') + `</tr>`;
    });
    html += `</tbody></table>`;
    // Legend
    html += `<div style='margin-top:18px;font-size:14px;font-weight:600;'>Legend</div>`;
    html += `<ul style='font-size:12px;'><li><span style='color:#3498db;'>Blue</span>: VAXIRAB</li><li><span style='color:#ff9800;'>Orange</span>: EQUIRAB</li><li><span style='color:#bfa800;'>Yellow</span>: ABH-TT/TCV</li></ul>`;
    // Prepared by
    html += `<div style='margin-top:18px;font-size:13px;'>Prepared by: <b>${data.preparedBy || ''}</b> <span style='font-weight:400;'>${data.preparedByTitle || ''}</span></div>`;
    win.document.write(`<html><head><title>Print Report</title></head><body style='font-family:Poppins,sans-serif;padding:24px;'>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
}

async function handlePrintAnimalBiteExposureReport(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/bitecases');
        const bitecases = await response.json();
        const cases = Array.isArray(bitecases) ? bitecases : bitecases.data;
        printAnimalBiteExposureReport(cases);
    } catch (error) {
        handleError(error);
    }
}

function printAnimalBiteExposureReport(cases) {
    let win = window.open('', '', 'width=1000,height=700');
    let html = `<div style='font-size:16px;font-weight:600;margin-bottom:8px;'>Animal Bite Exposure Report</div>`;
    html += `<div style='font-size:12px;margin-bottom:12px;'>Generated: ${new Date().toLocaleString()}</div>`;
    // Table
    html += `<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;width:100%;font-size:12px;'>`;
    html += `<thead><tr style='background:#800000;color:#fff;'><th>Reg. No.</th><th>Date</th><th>Name (Last, First)</th><th>Contact No.</th><th>Address</th><th>Date of Birth</th><th>Age</th><th>Sex</th><th>Exposure Date</th><th>Exposure Place</th><th>Animal Type</th><th>Bite Type</th><th>Bite Site</th></tr></thead><tbody>`;
    cases.forEach(row => {
        html += `<tr>` +
            `<td>${row.registrationNumber || ''}</td>` +
            `<td>${row.dateRegistered || ''}</td>` +
            `<td>${((row.lastName || '') + (row.firstName ? (', ' + row.firstName) : ''))}</td>` +
            `<td>${row.contactNo || ''}</td>` +
            `<td>${row.barangay || ''}</td>` +
            `<td>${row.dateOfBirth || ''}</td>` +
            `<td>${row.age || ''}</td>` +
            `<td>${row.sex || ''}</td>` +
            `<td>${row.exposureDate || ''}</td>` +
            `<td>${row.exposurePlace || ''}</td>` +
            `<td>${row.exposureSource || ''}</td>` +
            `<td>${row.exposureType || ''}</td>` +
            `<td>${row.biteSite || ''}</td>` +
        `</tr>`;
    });
    html += `</tbody></table>`;
    win.document.write(`<html><head><title>Print Report</title></head><body style='font-family:Poppins,sans-serif;padding:24px;'>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
}

async function handlePrintRabiesRegistryReport(e) {
    e.preventDefault();
    try {
        const response = await fetch('/api/reports/rabies-registry');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        const data = result.data;
        printRabiesRegistryReport(data);
    } catch (error) {
        handleError(error);
    }
}

function printRabiesRegistryReport(data) {
    let win = window.open('', '', 'width=1000,height=700');
    let html = `<div style='font-size:16px;font-weight:600;margin-bottom:8px;'>Rabies Exposure Registry</div>`;
    html += `<div style='font-size:12px;margin-bottom:12px;'>Generated: ${new Date().toLocaleString()}</div>`;
    // Table
    html += `<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;width:100%;font-size:12px;'>`;
    html += `<thead><tr style='background:#800000;color:#fff;'><th>Reg. No.</th><th>Date</th><th>Name (Last, First)</th><th>Contact No.</th><th>Address</th><th>Date of Birth</th><th>Age</th><th>Sex</th><th>Exposure Date</th><th>Exposure Place</th><th>Animal Type</th><th>Bite Type</th><th>Bite Site</th></tr></thead><tbody>`;
    data.forEach(row => {
        html += `<tr>` +
            `<td>${row.registrationNo || ''}</td>` +
            `<td>${row.registrationDate || ''}</td>` +
            `<td>${row.name || ''}</td>` +
            `<td>${row.contactNo || ''}</td>` +
            `<td>${row.address || ''}</td>` +
            `<td>${row.dateOfBirth || ''}</td>` +
            `<td>${row.age || ''}</td>` +
            `<td>${row.sex || ''}</td>` +
            `<td>${row.exposureDate || ''}</td>` +
            `<td>${row.exposurePlace || ''}</td>` +
            `<td>${row.animalType || ''}</td>` +
            `<td>${row.biteType || ''}</td>` +
            `<td>${row.biteSite || ''}</td>` +
        `</tr>`;
    });
    html += `</tbody></table>`;
    win.document.write(`<html><head><title>Print Report</title></head><body style='font-family:Poppins,sans-serif;padding:24px;'>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
}
