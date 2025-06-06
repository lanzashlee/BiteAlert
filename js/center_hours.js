document.addEventListener('DOMContentLoaded', function() {
    // Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // List of all center names
    const centers = [
      "Addition Hills", "Balong-Bato", "Batis", "Corazon De Jesus", "Ermitaño", "Halo-halo", "Isabelita",
      "Kabayanan", "Little Baguio", "Maytunas", "Onse", "Pasadeña", "Pedro Cruz", "Progreso", "Rivera",
      "Salapan", "San Perfecto", "Santa Lucia", "Tibagan", "West Crame", "Greenhills"
    ];

    // Default data for each center (with default hours)
    const defaultCenters = centers.map(name => ({
      name,
      location: "",
      hours: {
        weekday: { start: "08:00", end: "17:00" },
        saturday: { start: "09:00", end: "15:00" },
        sunday: { start: "09:00", end: "12:00" }
      }
    }));

    let editingIdx = null;
    const centersList = document.getElementById('centersList');

    function to12Hour(time24) {
      const [hour, minute] = time24.split(':');
      let h = parseInt(hour, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${minute} ${ampm}`;
    }
    function to24Hour(time12) {
      const [time, modifier] = time12.trim().split(' ');
      let [hours, minutes] = time.split(':');
      hours = hours.padStart(2, '0');
      if (modifier && modifier.toUpperCase() === 'PM' && hours !== '12') hours = String(parseInt(hours, 10) + 12).padStart(2, '0');
      if (modifier && modifier.toUpperCase() === 'AM' && hours === '12') hours = '00';
      return `${hours}:${minutes}`;
    }

    function populateCentersList(centers) {
      centersList.innerHTML = centers.map((center, idx) => `
        <tr>
          <td><strong>${center.name}</strong></td>
          <td>${center.location}</td>
          <td class="hours-cell">${to12Hour(center.hours.weekday.start)} - ${to12Hour(center.hours.weekday.end)}</td>
          <td class="hours-cell">${to12Hour(center.hours.saturday.start)} - ${to12Hour(center.hours.saturday.end)}</td>
          <td class="hours-cell">${to12Hour(center.hours.sunday.start)} - ${to12Hour(center.hours.sunday.end)}</td>
          <td><button class="btn btn-sm btn-primary update-btn" data-idx="${idx}">Update</button></td>
        </tr>
      `).join('');
    }

    // Initial load
    populateCentersList(defaultCenters);

    // Handle update button click
    centersList.addEventListener('click', function(e) {
      if (e.target.classList.contains('update-btn')) {
        const idx = e.target.getAttribute('data-idx');
        editingIdx = idx;
        const center = defaultCenters[idx];
        document.getElementById('centerName').value = center.name;
        document.getElementById('centerLocation').value = center.location;
        document.getElementById('weekdayStart').value = to12Hour(center.hours.weekday.start);
        document.getElementById('weekdayEnd').value = to12Hour(center.hours.weekday.end);
        document.getElementById('saturdayStart').value = to12Hour(center.hours.saturday.start);
        document.getElementById('saturdayEnd').value = to12Hour(center.hours.saturday.end);
        document.getElementById('sundayStart').value = to12Hour(center.hours.sunday.start);
        document.getElementById('sundayEnd').value = to12Hour(center.hours.sunday.end);
        // Show modal (Bootstrap 3)
        $('#editCenterModal').modal('show');
      }
    });

    // Handle modal form submit
    document.getElementById('editCenterForm').addEventListener('submit', function(e) {
      e.preventDefault();
      if (editingIdx !== null) {
        const center = defaultCenters[editingIdx];
        center.location = document.getElementById('centerLocation').value;
        center.hours.weekday.start = to24Hour(document.getElementById('weekdayStart').value);
        center.hours.weekday.end = to24Hour(document.getElementById('weekdayEnd').value);
        center.hours.saturday.start = to24Hour(document.getElementById('saturdayStart').value);
        center.hours.saturday.end = to24Hour(document.getElementById('saturdayEnd').value);
        center.hours.sunday.start = to24Hour(document.getElementById('sundayStart').value);
        center.hours.sunday.end = to24Hour(document.getElementById('sundayEnd').value);
        populateCentersList(defaultCenters);
        // Save to backend
        fetch('/api/center-hours/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(center)
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('Center hours updated successfully');
          } else {
            console.error('Failed to update center hours:', data.message);
          }
        })
        .catch(error => {
          console.error('Error saving center hours:', error);
        });
        // Hide modal (Bootstrap 3)
        $('#editCenterModal').modal('hide');
      }
    });

    // Sign Out Functionality
    const signOutBtn = document.getElementById('signOutBtn');
    const signoutModal = document.getElementById('signoutModal');
    const cancelSignout = document.getElementById('cancelSignout');
    const confirmSignout = document.getElementById('confirmSignout');

    signOutBtn.addEventListener('click', () => {
        signoutModal.style.display = 'flex';
    });

    cancelSignout.addEventListener('click', () => {
        signoutModal.style.display = 'none';
    });

    confirmSignout.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}); 