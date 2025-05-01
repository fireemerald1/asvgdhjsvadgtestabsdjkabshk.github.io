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
    const githubToken = typeof CONFIG !== 'undefined' ? CONFIG.GITHUB_TOKEN : '';
    
    // If config is missing, show error
    if (!resendApiKey) {
      console.error('Missing Resend API key');
      // Fall back to GitHub repository dispatch if GitHub token is available
      if (githubToken) {
        return await sendViaGitHub(name, email, subject, message, statusDiv, submitBtn, githubToken);
      } else {
        statusDiv.textContent = 'Configuration error. Please contact the site administrator.';
        statusDiv.style.color = '#800000';
        submitBtn.disabled = false;
        return;
      }
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
    
    try {
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
      
      console.log('Resend API response status:', res.status);
      
      // Try to parse the response as JSON, but handle if it's not JSON
      let result;
      try {
        result = await res.json();
        console.log('Resend API response:', result);
      } catch (e) {
        console.error('Error parsing response:', e);
        // If we can't parse JSON but the status is good, assume success
        if (res.ok) {
          result = { ok: true };
        } else {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
      }
      
      if (res.ok) {
        // Store submission time for rate limiting
        localStorage.setItem('lastFormSubmission', now.toString());
        
        // Show success message inline instead of hiding the form
        statusDiv.textContent = 'Email sent successfully! Thank you for your message.';
        statusDiv.style.color = '#00ff00';
        
        // Clear the form
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-subject').value = '';
        document.getElementById('contact-email').value = '';
        document.getElementById('contact-message').value = '';
      } else {
        // If Resend API fails, try GitHub as fallback if token is available
        if (githubToken) {
          console.log('Resend API failed, trying GitHub fallback');
          return await sendViaGitHub(name, email, subject, message, statusDiv, submitBtn, githubToken);
        } else {
          throw new Error(result.message || 'Email sending failed');
        }
      }
    } catch (error) {
      console.error('Error sending via Resend:', error);
      // If Resend API fails, try GitHub as fallback if token is available
      if (githubToken) {
        console.log('Resend API error, trying GitHub fallback');
        return await sendViaGitHub(name, email, subject, message, statusDiv, submitBtn, githubToken);
      } else {
        throw error; // Re-throw to be caught by the outer catch
      }
    }
  } catch (err) {
    statusDiv.textContent = 'Network error. Please try again later.';
    statusDiv.style.color = '#800000';
    console.error('Contact form error:', err);
  } finally {
    submitBtn.disabled = false;
  }
}

// Function to send contact form via GitHub repository dispatch as a fallback
async function sendViaGitHub(name, email, subject, message, statusDiv, submitBtn, githubToken) {
  try {
    console.log('Attempting to send via GitHub repository dispatch');
    const githubApiUrl = 'https://api.github.com/repos/fireemerald1/fire-exe-website.github.io/dispatches';
    
    // Send the form data to GitHub repository dispatch API
    const res = await fetch(githubApiUrl, {
      method: 'POST',
      headers: { 
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'contact-form-submission',
        client_payload: { 
          name,
          email,
          subject,
          message,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    console.log('GitHub API response status:', res.status);
    
    if (res.status === 204) {
      // Store submission time for rate limiting
      localStorage.setItem('lastFormSubmission', new Date().getTime().toString());
      
      // Show success message inline instead of hiding the form
      statusDiv.textContent = 'Message received! Thank you for your submission.';
      statusDiv.style.color = '#00ff00';
      
      // Clear the form
      document.getElementById('contact-name').value = '';
      document.getElementById('contact-subject').value = '';
      document.getElementById('contact-email').value = '';
      document.getElementById('contact-message').value = '';
      
      return true;
    } else {
      throw new Error(`GitHub API error: ${res.status}`);
    }
  } catch (err) {
    console.error('Error sending via GitHub:', err);
    statusDiv.textContent = 'Network error. Please try again later.';
    statusDiv.style.color = '#800000';
    submitBtn.disabled = false;
    return false;
  }
}

// Function to check for inappropriate content
async function containsBadWords(text) {
  // TO DO: implement bad words checking logic here
  // For now, just return false
  return false;
}

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
