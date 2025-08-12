/**
 * Update statistics displayed on the dashboard
 * Shows total customers, appointments, and other metrics
 */
function updateStatistics() {
    try {
        // Get stats containers
        const customerCountEl = document.getElementById('customer-count');
        const appointmentCountEl = document.getElementById('appointment-count');
        const upcomingAppointmentsEl = document.getElementById('upcoming-appointments');
        
        // Update statistics if elements exist
        if (customerCountEl) {
            customerCountEl.textContent = customers.length || '0';
        }
        
        if (appointmentCountEl) {
            appointmentCountEl.textContent = appointments.length || '0';
        }
        
        if (upcomingAppointmentsEl) {
            // Count appointments that are in the future
            const now = new Date();
            const upcomingCount = appointments.filter(appointment => {
                const appointmentDate = new Date(appointment.start);
                return appointmentDate > now;
            }).length;
            
            upcomingAppointmentsEl.textContent = upcomingCount || '0';
        }
        
        console.log('Statistics updated successfully');
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}
