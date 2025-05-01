// JS to handle contact form submission using Resend
async function sendContactForm(e) {
  e.preventDefault();
  const name = document.getElementById('contact-name').value;
  const subject = document.getElementById('contact-subject').value;
  const email = document.getElementById('contact-email').value;
  const message = document.getElementById('contact-message').value;
  const statusDiv = document.getElementById('contact-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const formElement = document.getElementById('contact-form');
  const successMessage = document.getElementById('success-message');
  
  // Clear previous status and disable button
  statusDiv.textContent = 'Sending...';
  statusDiv.style.color = '#00ffff';
  submitBtn.disabled = true;
  
  try {
    // Check for bad words in the message, name, and subject
    const textToCheck = `${name} ${subject} ${message}`;
    const hasBadWords = await containsBadWords(textToCheck);
    
    if (hasBadWords) {
      statusDiv.textContent = 'Message contains inappropriate content and cannot be sent.';
      statusDiv.style.color = '#800000';
      submitBtn.disabled = false;
      return;
    }
    
    // Get configuration from config.js (which is not uploaded to GitHub)
    // If CONFIG is not defined, use fallback values for local development only
    // Default Resend API endpoint if CONFIG is not available
    const resendApiUrl = typeof CONFIG !== 'undefined' ? CONFIG.RESEND_API_ENDPOINT : 'https://api.resend.com/emails';
    const resendApiKey = typeof CONFIG !== 'undefined' ? CONFIG.RESEND_API_KEY : '';
    
    // If config is missing, show error
    if (!resendApiUrl || !resendApiKey) {
      statusDiv.textContent = 'Configuration error. Please contact the site administrator.';
      statusDiv.style.color = '#800000';
      submitBtn.disabled = false;
      return;
    }
    
    // Get current domain for tracking purposes only
    const currentDomain = window.location.hostname;
    // Domain verification removed - allow submissions from any domain
    
    // Add rate limiting - store last submission time
    const lastSubmission = localStorage.getItem('lastFormSubmission');
    const now = new Date().getTime();
    
    // If submitted in the last 60 seconds, prevent submission
    if (lastSubmission && (now - parseInt(lastSubmission)) < 60000) {
      statusDiv.textContent = 'Please wait a minute before sending another message.';
      statusDiv.style.color = '#800000';
      submitBtn.disabled = false;
      return;
    }
    
    const res = await fetch(resendApiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({ 
        from: 'onboarding@resend.dev',
        to: 'fireexecontact@gmail.com', // The recipient email address
        reply_to: email,
        subject: `Contact Form: ${subject}`, 
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong></p>
               <p>${message.replace(/\n/g, '<br>')}</p>
               <p><em>Sent from: ${currentDomain}</em></p>`
      })
    });
    
    const result = await res.json();
    if (result.ok) {
      // Store submission time for rate limiting
      localStorage.setItem('lastFormSubmission', now.toString());
      
      // Show success message inline instead of hiding the form
      statusDiv.textContent = 'Email sent successfully! Thank you for your message.';
      statusDiv.style.color = '#00ffff';
      
      // Clear the form fields
      formElement.reset();
    } else {
      statusDiv.textContent = 'Error: ' + (result.error || 'Could not send email.');
      statusDiv.style.color = '#800000'; // Using the darker red color
    }
  } catch (err) {
    statusDiv.textContent = 'Network error. Please try again later.';
    statusDiv.style.color = '#800000'; // Using the darker red color
  } finally {
    submitBtn.disabled = false;
  }
}

// We no longer need the showFormAgain function since we're not hiding the form

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('contact-form');
  const sendAnotherBtn = document.getElementById('send-another');
  
  if (form) {
    form.addEventListener('submit', sendContactForm);
    
    // Add hover effect to the submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.addEventListener('mouseover', function() {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 0 15px rgba(0, 119, 119, 0.5)';
      });
      submitBtn.addEventListener('mouseout', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
      });
    }
  }
  
  // We no longer need the 'Send Another Message' button functionality
});
