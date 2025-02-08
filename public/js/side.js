// Function to toggle the sidebar visibility
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarLeft');
    sidebar.classList.toggle('show'); // Toggles the 'show' class to slide the sidebar in/out
}

// Add an event listener for a button click (e.g., a hamburger menu)
if (document.getElementById('sidebar-toggle-btn')) document.getElementById('sidebar-toggle-btn').addEventListener('click', toggleSidebar);
