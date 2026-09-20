/**
 * Royal Home Painting — Lead Capture Form & Modal Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lead-capture-form');
  const submitBtn = document.getElementById('lead-submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const errorFeedback = document.getElementById('form-feedback-error');

  const modal = document.getElementById('success-modal');
  const modalUserName = document.getElementById('modal-user-name');
  const modalWhatsAppLink = document.getElementById('modal-whatsapp-link');
  const modalDoneBtn = document.getElementById('modal-done-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');

  if (!form) return;

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const area = form.area.value.trim();
    const service = form.service.value;
    const notes = form.notes.value.trim();
    const honeypot = form.website_url_hp.value.trim();

    // Client-side validation
    if (!name || name.length < 2) {
      showError('Please enter your full name so our team knows who to ask for.');
      form.name.focus();
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (!phone || digits.length < 10) {
      showError('Please enter a valid 10-digit mobile number for the callback.');
      form.phone.focus();
      return;
    }

    // Set UI loading state
    setLoading(true);

    try {
      const apiEndpoint = window.location.hostname.includes('github.io')
        ? 'https://royal-home-painting.vercel.app/api/leads'
        : '/api/leads';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          area,
          service,
          notes,
          website_url_hp: honeypot
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit quote request. Please try again.');
      }

      // Reset form
      form.reset();

      // Setup success modal
      if (modalUserName) {
        modalUserName.textContent = name;
      }

      if (modalWhatsAppLink) {
        const msg = `Hi Royal Home Painting! I just submitted a quote request for ${service} in ${area || 'Bangalore'}. My name is ${name}.`;
        const waUrl = (data.whatsappUrl && data.whatsappUrl.includes('api.whatsapp.com'))
          ? data.whatsappUrl
          : `https://api.whatsapp.com/send?phone=919740318779&text=${encodeURIComponent(msg)}`;
        modalWhatsAppLink.href = waUrl;
      }

      // Open modal
      openModal();

    } catch (err) {
      console.error('Lead submission error:', err);
      showError(err.message || 'Something went wrong while sending your request. Please call or WhatsApp us directly at +91 97403 18779.');
    } finally {
      setLoading(false);
    }
  });

  // Modal interactions
  function openModal() {
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Helper functions
  function setLoading(isLoading) {
    if (submitBtn) submitBtn.disabled = isLoading;
    if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
    if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline' : 'none';
  }

  function showError(msg) {
    if (errorFeedback) {
      errorFeedback.textContent = msg;
      errorFeedback.style.display = 'block';
      errorFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function hideError() {
    if (errorFeedback) {
      errorFeedback.textContent = '';
      errorFeedback.style.display = 'none';
    }
  }
});
