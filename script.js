// ==========================================================
// IRONFIT — script.js
// 0 Config  1 Helpers  2 Menu  3 Scroll  4 Program selection
// 5 WhatsApp  6 Form  7 FAQ  8 Lightbox  9 Init
// ==========================================================

// 0. CONFIG — the only values to change for a new client
const CONFIG = {
  whatsappNumber: '919999999999', // PLACEHOLDER: country code + number, no "+" or spaces
  gymName: 'IronFit',
  formEndpoint: ''                // e.g. a Formspree URL. Empty = demo mode: nothing is sent anywhere
};

// 1. HELPERS
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Several features (menu, lightbox) lock page scrolling. A Set remembers who asked,
// so closing one does not unlock the page while the other is still open.
const scrollLocks = new Set();
function setScrollLock(reason, locked) {
  locked ? scrollLocks.add(reason) : scrollLocks.delete(reason);
  document.body.classList.toggle('no-scroll', scrollLocks.size > 0);
}

// 2. MOBILE MENU
const navbar = $('#navbar');
const hamburger = $('#hamburger');
const navMenu = $('#nav-menu');

function setMenu(open) {
  navMenu.classList.toggle('open', open);
  hamburger.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
  setScrollLock('menu', open);
}
const isMenuOpen = () => navMenu.classList.contains('open');

hamburger.addEventListener('click', () => setMenu(!isMenuOpen()));
$$('a', navMenu).forEach(link => link.addEventListener('click', () => setMenu(false)));
// Click outside: listen on the whole document and check where the click happened
document.addEventListener('click', event => {
  if (isMenuOpen() && !navMenu.contains(event.target) && !hamburger.contains(event.target)) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && isMenuOpen()) { setMenu(false); hamburger.focus(); }
});
// If the window grows to desktop size while the menu is open, reset it
window.matchMedia('(min-width: 1181px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

// 3. SCROLL EFFECTS
function handleScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  navbar.style.setProperty('--progress', maxScroll > 0 ? window.scrollY / maxScroll : 0); // drives the thin progress line
}
window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// IntersectionObserver reports when elements enter the screen (cheaper than checking on every scroll)
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => revealObserver.observe(el));

const navLinks = $$('.nav-link');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach(section => sectionObserver.observe(section));

// 4. PROGRAM / PLAN SELECTION
const form = $('#contact-form');
const programSelect = $('#program');
const programNote = $('#program-note');

function selectProgram(name, { scroll = false } = {}) {
  programSelect.value = name;
  if (programSelect.value !== name) programSelect.value = ''; // name not in the list
  // Visual indicator on the matching card(s)
  $$('[data-program]').forEach(button => {
    button.closest('.card').classList.toggle('is-selected', button.dataset.program === programSelect.value);
  });
  programNote.textContent = programSelect.value ? `${programSelect.value} added to your enquiry.` : '';
  updateWhatsAppLinks();
  if (scroll) form.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}
$$('[data-program]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault(); // we do the scrolling ourselves
    selectProgram(button.dataset.program, { scroll: true });
  });
});
programSelect.addEventListener('change', () => selectProgram(programSelect.value));

// 5. WHATSAPP — one function builds every WhatsApp link from CONFIG
function buildWhatsAppUrl(program) {
  const text = program
    ? `Hi ${CONFIG.gymName}, I'm interested in ${program}. I'd like to know more about your plans.`
    : `Hi ${CONFIG.gymName}, I'm interested in joining your fitness studio. I'd like to know more about your programs.`;
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
function updateWhatsAppLinks() {
  const program = programSelect.value;
  $$('[data-whatsapp]').forEach(link => {
    link.href = buildWhatsAppUrl(program);
    link.setAttribute('aria-label', program ? `Chat with ${CONFIG.gymName} on WhatsApp about ${program}` : `Chat with ${CONFIG.gymName} on WhatsApp`);
  });
}

// 6. CONTACT FORM
const validators = {
  name: value => value.trim().length >= 2 ? '' : 'Please enter your full name.',
  phone: value => /^(?:\+?91|0)?[6-9]\d{9}$/.test(value.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit Indian mobile number.',
  email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'Please enter a valid email address.',
  program: value => value ? '' : 'Please choose a program or plan.',
  message: value => value.trim().length >= 10 ? '' : 'Please write at least 10 characters.'
};

function validateField(fieldName) {
  const input = form.elements[fieldName];
  const message = validators[fieldName](input.value);
  $('#' + fieldName + '-error').textContent = message;
  input.closest('.field').classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', Boolean(message));
  return !message;
}
function validateForm() {
  // Check every field (no early exit) so all errors show at once
  const results = Object.keys(validators).map(validateField);
  const firstInvalid = Object.keys(validators).find(name => form.elements[name].getAttribute('aria-invalid') === 'true');
  if (firstInvalid) form.elements[firstInvalid].focus();
  return results.every(Boolean);
}
// Validate a field when the user leaves it, and re-check while typing once it has an error
Object.keys(validators).forEach(fieldName => {
  const input = form.elements[fieldName];
  input.addEventListener('blur', () => validateField(fieldName));
  input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) validateField(fieldName); });
});

// BACKEND HOOK: this is the one function to change when a real backend or form service exists.
// With CONFIG.formEndpoint empty it only simulates a delay and reports { delivered: false }.
async function submitEnquiry(data) {
  if (!CONFIG.formEndpoint) {
    await new Promise(resolve => setTimeout(resolve, 900));
    return { delivered: false };
  }
  const response = await fetch(CONFIG.formEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Request failed: ' + response.status);
  return { delivered: true };
}

const submitButton = $('#submit-btn');
const statusBox = $('#form-status');

function setLoading(isLoading) {
  submitButton.classList.toggle('is-loading', isLoading);
  submitButton.disabled = isLoading;
  $('.btn__label', submitButton).textContent = isLoading ? 'Sending...' : 'Send Enquiry';
}
function showStatus(type, text, whatsappProgram) {
  statusBox.className = 'form__status form__status--' + type;
  statusBox.textContent = text;
  if (whatsappProgram !== undefined) { // add a button that really reaches the gym
    const link = document.createElement('a');
    link.className = 'btn btn--primary btn--block';
    link.target = '_blank'; link.rel = 'noopener';
    link.href = buildWhatsAppUrl(whatsappProgram);
    link.textContent = 'Send via WhatsApp instead';
    statusBox.append(document.createElement('br'), link);
  }
  statusBox.hidden = false;
}

form.addEventListener('submit', async event => {
  event.preventDefault(); // stop the page reloading
  statusBox.hidden = true;
  if (!validateForm()) return;

  const data = Object.fromEntries(new FormData(form));
  setLoading(true);
  try {
    const result = await submitEnquiry(data);
    if (result.delivered) {
      showStatus('delivered', `Thanks, ${data.name}. Your enquiry has been sent.`);
    } else {
      showStatus('demo', 'Your details look good, but nothing has been sent. This demo form is not connected to a server yet. To enquire now, use WhatsApp:', data.program);
    }
    form.reset();
    selectProgram('');
  } catch (error) {
    console.error(error);
    showStatus('error', 'Sorry, something went wrong and your enquiry was not sent. Please try again, or contact us on WhatsApp.', data.program);
  } finally {
    setLoading(false);
  }
});

// 7. FAQ ACCORDION
const faqQuestions = $$('.faq__question');
faqQuestions.forEach(question => {
  question.addEventListener('click', () => {
    const wasOpen = question.getAttribute('aria-expanded') === 'true';
    faqQuestions.forEach(other => { // close all, so only one is ever open
      other.setAttribute('aria-expanded', 'false');
      other.closest('.faq__item').classList.remove('open');
    });
    if (!wasOpen) {
      question.setAttribute('aria-expanded', 'true');
      question.closest('.faq__item').classList.add('open');
    }
  });
});

// 8. GALLERY LIGHTBOX
const galleryItems = $$('.gallery__item');
const lightbox = $('#lightbox');
const lightboxImg = $('#lightbox-img');
const lightboxCaption = $('#lightbox-caption');
let currentImage = 0;
let focusBeforeLightbox = null;

function showImage(index) {
  currentImage = (index + galleryItems.length) % galleryItems.length; // wraps around
  const item = galleryItems[currentImage];
  lightboxImg.src = item.dataset.full;
  lightboxImg.alt = $('img', item).alt;
  lightboxCaption.textContent = `${item.dataset.caption} (${currentImage + 1} of ${galleryItems.length})`;
}
function openLightbox(index) {
  focusBeforeLightbox = document.activeElement; // remember it so we can return focus on close
  showImage(index);
  lightbox.hidden = false;
  setScrollLock('lightbox', true);
  $('#lightbox-close').focus();
}
function closeLightbox() {
  lightbox.hidden = true;
  setScrollLock('lightbox', false);
  if (focusBeforeLightbox) focusBeforeLightbox.focus();
}
galleryItems.forEach((item, index) => item.addEventListener('click', () => openLightbox(index)));
$('#lightbox-close').addEventListener('click', closeLightbox);
$('#lightbox-prev').addEventListener('click', () => showImage(currentImage - 1));
$('#lightbox-next').addEventListener('click', () => showImage(currentImage + 1));
lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', event => {
  if (lightbox.hidden) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showImage(currentImage - 1);
  if (event.key === 'ArrowRight') showImage(currentImage + 1);
  if (event.key === 'Tab') { // keep keyboard focus inside the lightbox
    const buttons = $$('button', lightbox);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
// Swipe left/right on touch screens
let touchStartX = 0;
lightbox.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', event => {
  const distance = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(distance) > 50) showImage(currentImage + (distance < 0 ? 1 : -1));
}, { passive: true });

// 9. INIT
updateWhatsAppLinks();
// If an image fails to load, hide it; its gradient box stays
$$('img').forEach(img => img.addEventListener('error', () => { img.style.display = 'none'; }));
