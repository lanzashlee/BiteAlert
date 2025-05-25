// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const signOutBtn = document.getElementById('signOutBtn');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for Rabies Registry Report if present
    const rabiesRegistryForm = document.getElementById('rabiesRegistryReportForm');
    if (rabiesRegistryForm) {
        rabiesRegistryForm.addEventListener('submit', handleRabiesRegistryReport);
    }
    // Add event listener for Animal Bite Exposure Report
    const animalBiteExposureForm = document.getElementById('animalBiteExposureReportForm');
    if (animalBiteExposureForm) {
        animalBiteExposureForm.addEventListener('submit', handleAnimalBiteExposureReport);
    }
    // Add event listener for Rabies Utilization Report
    const rabiesUtilizationForm = document.getElementById('rabiesUtilizationReportForm');
    if (rabiesUtilizationForm) {
        rabiesUtilizationForm.addEventListener('submit', handleRabiesUtilizationReport);
    }
    // Menu toggle for mobile
    if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    }
    // Sign out functionality
    if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
    }
});

// Show/Hide Loading Overlay
function showLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('active');
}

function hideLoading() {
    if (loadingOverlay) loadingOverlay.classList.remove('active');
}

// Error Handler
function handleError(error) {
    console.error('Error:', error);
    hideLoading();
    alert('An error occurred while generating the report. Please try again.');
}

// Rabies Registry Report Handler
async function handleRabiesRegistryReport(e) {
    e.preventDefault();
    showLoading();
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
    hideLoading();
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

// Sign Out Handler
async function handleSignOut() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                role: user.role,
                fullName: user.fullName
            })
        });
        if (response.ok) {
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Error during sign out:', error);
        alert('Failed to sign out. Please try again.');
    }
}

// Handler for Animal Bite Exposure Report
async function handleAnimalBiteExposureReport(e) {
    e.preventDefault();
    showLoading();
    try {
        const response = await fetch('/api/reports/animal-bite-exposure');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        generateAnimalBiteExposurePDF(result.data);
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
    hideLoading();
}

// Handler for Rabies Utilization Report
async function handleRabiesUtilizationReport(e) {
    e.preventDefault();
    showLoading();
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
    hideLoading();
}
