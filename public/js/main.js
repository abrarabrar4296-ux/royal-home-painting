/**
 * Royal Home Painting — Main Interactive UI Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNav();
  initScrollReveals();
  initSmoothScroll();
});

/**
 * Adds background blur and shadow when scrolled
 */
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close mobile menu when clicking nav link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Staggered IntersectionObserver for element reveals
 */
function initScrollReveals() {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    reveals.forEach(el => el.classList.add('active'));
  }
}

/**
 * Smooth anchor scrolling
 */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/**
 * Quick helper to set dropdown value when clicking a service card CTA
 * @param {string} serviceName 
 */
window.selectServiceOption = function(serviceName) {
  const select = document.getElementById('lead-service');
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value.includes(serviceName)) {
        select.selectedIndex = i;
        break;
      }
    }
  }
  const formElement = document.getElementById('quote-form');
  if (formElement) {
    formElement.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('lead-name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 400);
    }
  }
};

/**
 * Progressive Web App (PWA) & App Download Modal Handlers
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration skipped:', err);
    });
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('pwa-install-btn');
  if (pwaBtn) {
    pwaBtn.innerHTML = '⚡ Tap to Install App Directly';
  }
});

window.switchDeviceTab = function(tabName, btn) {
  document.querySelectorAll('.device-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.device-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('panel-' + tabName);
  if (panel) panel.classList.add('active');
};

window.openAppModal = function(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('app-modal');
  if (modal) {
    modal.classList.add('active');

    // Auto-detect user operating system to preselect the most relevant tab
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      const iosBtn = document.querySelector(".device-tab-btn[onclick*='ios']");
      if (iosBtn) window.switchDeviceTab('ios', iosBtn);
    } else if (/Android/.test(ua)) {
      const androidBtn = document.querySelector(".device-tab-btn[onclick*='android']");
      if (androidBtn) window.switchDeviceTab('android', androidBtn);
    } else if (/Win/.test(ua)) {
      const winBtn = document.querySelector(".device-tab-btn[onclick*='windows']");
      if (winBtn) window.switchDeviceTab('windows', winBtn);
    }
  }
};

window.closeAppModal = function() {
  const modal = document.getElementById('app-modal');
  if (modal) modal.classList.remove('active');
};

document.addEventListener('DOMContentLoaded', () => {
  const pwaBtn = document.getElementById('pwa-install-btn');
  if (pwaBtn) {
    pwaBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('PWA prompt response:', outcome);
        deferredPrompt = null;
      } else {
        alert('To install the Royal Home Painting app:\n\n• On Android (Chrome): Tap the 3-dot menu (⋮) -> "Add to Home screen" or "Install App".\n• On iPhone (Safari): Tap Share (⎋) -> "Add to Home Screen".\n• On Desktop (Chrome/Edge): Click the Install icon in your browser address bar.');
      }
    });
  }

  // Close modal when clicking backdrop
  const appModal = document.getElementById('app-modal');
  if (appModal) {
    appModal.addEventListener('click', (e) => {
      if (e.target === appModal) {
        closeAppModal();
      }
    });
  }
});

