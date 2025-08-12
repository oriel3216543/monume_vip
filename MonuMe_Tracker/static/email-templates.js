// Email Notification Template Handler for MonuMe Tracker

// HTML Templates for different email notifications
const emailTemplates = {
    // Appointment Confirmation Email
    confirmation: {
        subject: "Appointment Confirmation - MonuMe Tracker",
        html: appointmentData => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Confirmation</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                }
                .email-header {
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .email-body {
                    padding: 30px;
                }
                .appointment-details {
                    background-color: #f5f5f5;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                }
                .detail-label {
                    width: 40%;
                    font-weight: bold;
                    color: #6a11cb;
                }
                .detail-value {
                    width: 60%;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 30px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background-color: #f5f5f5;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                @media only screen and (max-width: 600px) {
                    .email-container {
                        width: 100%;
                        border-radius: 0;
                    }
                    .detail-row {
                        flex-direction: column;
                    }
                    .detail-label, .detail-value {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <h1>Appointment Confirmation</h1>
                </div>
                <div class="email-body">
                    <p>Dear ${appointmentData.customerName},</p>
                    <p>Your appointment has been confirmed. Here are the details:</p>
                    
                    <div class="appointment-details">
                        <div class="detail-row">
                            <div class="detail-label">Service:</div>
                            <div class="detail-value">${appointmentData.type} - ${appointmentData.title}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date:</div>
                            <div class="detail-value">${formatDate(appointmentData.date)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Time:</div>
                            <div class="detail-value">${appointmentData.time}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Location:</div>
                            <div class="detail-value">MonuMe Queens, 123 Main Street</div>
                        </div>
                        ${appointmentData.description ? `
                        <div class="detail-row">
                            <div class="detail-label">Notes:</div>
                            <div class="detail-value">${appointmentData.description}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
                    
                    <a href="${appointmentData.confirmationLink || '#'}" class="button">Manage Your Appointment</a>
                    
                    <p>Thank you for choosing MonuMe!</p>
                </div>
                <div class="footer">
                    <p>MonuMe Queens | 123 Main Street | Queens, NY 12345</p>
                    <p>Phone: (123) 456-7890 | Email: info@monume.com</p>
                </div>
            </div>
        </body>
        </html>
        `
    },
    
    // Reminder Email Template
    reminder: {
        subject: "Appointment Reminder - MonuMe Tracker",
        html: appointmentData => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Reminder</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                }
                .email-header {
                    background: linear-gradient(135deg, #ff9800 0%, #f44336 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .email-body {
                    padding: 30px;
                }
                .appointment-details {
                    background-color: #f5f5f5;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                }
                .detail-label {
                    width: 40%;
                    font-weight: bold;
                    color: #ff9800;
                }
                .detail-value {
                    width: 60%;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #ff9800 0%, #f44336 100%);
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 30px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background-color: #f5f5f5;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                @media only screen and (max-width: 600px) {
                    .email-container {
                        width: 100%;
                        border-radius: 0;
                    }
                    .detail-row {
                        flex-direction: column;
                    }
                    .detail-label, .detail-value {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <h1>Appointment Reminder</h1>
                </div>
                <div class="email-body">
                    <p>Dear ${appointmentData.customerName},</p>
                    <p>This is a friendly reminder about your upcoming appointment:</p>
                    
                    <div class="appointment-details">
                        <div class="detail-row">
                            <div class="detail-label">Service:</div>
                            <div class="detail-value">${appointmentData.type} - ${appointmentData.title}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date:</div>
                            <div class="detail-value">${formatDate(appointmentData.date)}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Time:</div>
                            <div class="detail-value">${appointmentData.time}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Location:</div>
                            <div class="detail-value">MonuMe Queens, 123 Main Street</div>
                        </div>
                    </div>
                    
                    <p>Please arrive 10 minutes before your scheduled appointment time.</p>
                    
                    <a href="${appointmentData.confirmationLink || '#'}" class="button">View Appointment Details</a>
                    
                    <p>If you need to reschedule, please contact us as soon as possible.</p>
                    
                    <p>We look forward to seeing you!</p>
                </div>
                <div class="footer">
                    <p>MonuMe Queens | 123 Main Street | Queens, NY 12345</p>
                    <p>Phone: (123) 456-7890 | Email: info@monume.com</p>
                </div>
            </div>
        </body>
        </html>
        `
    },
    
    // Rescheduled Appointment Template
    rescheduled: {
        subject: "Appointment Rescheduled - MonuMe Tracker",
        html: (appointmentData, oldDate, oldTime) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Rescheduled</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                }
                .email-header {
                    background: linear-gradient(135deg, #ff9800 0%, #e91e63 100%);
                    color: white;
                    padding: 20px;
                    text-align: center;
                }
                .email-body {
                    padding: 30px;
                }
                .appointment-details {
                    background-color: #f5f5f5;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                }
                .detail-row {
                    display: flex;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                }
                .detail-label {
                    width: 40%;
                    font-weight: bold;
                    color: #ff9800;
                }
                .detail-value {
                    width: 60%;
                }
                .old-value {
                    text-decoration: line-through;
                    color: #999;
                    margin-right: 10px;
                }
                .new-value {
                    font-weight: bold;
                    color: #e91e63;
                }
                .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #ff9800 0%, #e91e63 100%);
                    color: white;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 30px;
                    font-weight: bold;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    background-color: #f5f5f5;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                @media only screen and (max-width: 600px) {
                    .email-container {
                        width: 100%;
                        border-radius: 0;
                    }
                    .detail-row {
                        flex-direction: column;
                    }
                    .detail-label, .detail-value {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="email-header">
                    <h1>Appointment Rescheduled</h1>
                </div>
                <div class="email-body">
                    <p>Dear ${appointmentData.customerName},</p>
                    <p>Your appointment has been rescheduled. Please note the new details:</p>
                    
                    <div class="appointment-details">
                        <div class="detail-row">
                            <div class="detail-label">Service:</div>
                            <div class="detail-value">${appointmentData.type} - ${appointmentData.title}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Date:</div>
                            <div class="detail-value">
                                <span class="old-value">${formatDate(oldDate)}</span>
                                <span class="new-value">${formatDate(appointmentData.date)}</span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Time:</div>
                            <div class="detail-value">
                                <span class="old-value">${oldTime}</span>
                                <span class="new-value">${appointmentData.time}</span>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Location:</div>
                            <div class="detail-value">MonuMe Queens, 123 Main Street</div>
                        </div>
                    </div>
                    
                    <p>If this new time doesn't work for you, please contact us to make further arrangements.</p>
                    
                    <a href="${appointmentData.confirmationLink || '#'}" class="button">Confirm New Time</a>
                    
                    <p>Thank you for your understanding.</p>
                </div>
                <div class="footer">
                    <p>MonuMe Queens | 123 Main Street | Queens, NY 12345</p>
                    <p>Phone: (123) 456-7890 | Email: info@monume.com</p>
                </div>
            </div>
        </body>
        </html>
        `
    }
};

// Helper function to format dates nicely
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Function to generate email content based on template type
function generateEmailContent(templateType, appointmentData, additionalData = {}) {
    if (!emailTemplates[templateType]) {
        console.error(`Template type '${templateType}' not found`);
        return null;
    }
    
    const template = emailTemplates[templateType];
    
    // Generate subject line
    const subject = template.subject;
    
    // Generate HTML content based on template type
    let htmlContent;
    
    if (templateType === 'rescheduled') {
        htmlContent = template.html(
            appointmentData, 
            additionalData.oldDate || '', 
            additionalData.oldTime || ''
        );
    } else {
        htmlContent = template.html(appointmentData);
    }
    
    return {
        subject,
        html: htmlContent
    };
}

// Function to show email preview in a modal
function showEmailPreview(appointmentData, templateType = 'confirmation', additionalData = {}) {
    // Generate email content
    const emailContent = generateEmailContent(templateType, appointmentData, additionalData);
    
    if (!emailContent) return;
    
    // Create a modal to display the email preview
    const previewModal = document.createElement('div');
    previewModal.className = 'modal';
    previewModal.id = 'email-preview-modal';
    
    previewModal.innerHTML = `
    <div class="modal-content" style="max-width: 700px !important;">
        <span class="close" onclick="closeModal('email-preview-modal')">&times;</span>
        <h2>${emailContent.subject}</h2>
        
        <div class="email-preview-controls" style="margin-bottom: 15px; display: flex; gap: 10px;">
            <button class="btn-primary" onclick="sendEmail(${appointmentData.id}, '${templateType}')">
                <i class="fas fa-paper-plane"></i> Send Email
            </button>
            <button class="btn-outline" onclick="closeModal('email-preview-modal')">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
        
        <div class="email-preview-container" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; max-height: 500px; overflow-y: auto;">
            ${emailContent.html}
        </div>
    </div>
    `;
    
    document.body.appendChild(previewModal);
    showModal('email-preview-modal');
}

// Function to actually send the email (integrate with your backend)
function sendEmail(appointmentId, templateType) {
    // Find appointment data
    const appointment = appointments.find(a => a.id === appointmentId);
    
    if (!appointment) {
        console.error('Appointment not found');
        return;
    }
    
    // Here you would integrate with your email sending service
    // For demo purposes, we'll just show a notification
    
    showNotification(`Email ${templateType} sent to ${appointment.customerEmail || appointment.customerName}`, 'success');
    
    // Close the email preview modal
    closeModal('email-preview-modal');
}

// Export the functions
window.emailTemplates = emailTemplates;
window.showEmailPreview = showEmailPreview;
window.sendEmail = sendEmail;
