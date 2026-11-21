// The sign-up site only (scripts/preview/sites.mjs, site "signup"), never part
// of the theme. No Shopify store sits behind these pages, so the theme's
// sign-up form (a Shopify customer form that posts to /contact) sends the
// email to the Kit form named by this script tag's data-kit-form instead, and
// shows the same thank-you the theme shows after Shopify accepts a sign-up.
const endpoint = `https://app.kit.com/forms/${document.currentScript.dataset.kitForm}/subscriptions`;
const FAILED = 'Sorry, that didn’t go through. Please try again in a moment.';

function showSuccess(form, text) {
  const success = document.createElement('p');
  success.className = 'signup__success';
  success.setAttribute('role', 'status');
  success.tabIndex = -1;
  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.setAttribute('aria-hidden', 'true');
  success.append(chevron, text);
  form.replaceChildren(success);
  success.focus();
}

function showError(form, input, text) {
  const id = `${form.id}-error`;
  let error = form.querySelector('.signup__error');
  if (!error) {
    error = document.createElement('p');
    error.id = id;
    error.className = 'signup__error';
    error.setAttribute('role', 'alert');
    form.querySelector('.signup__row').after(error);
  }
  error.textContent = text;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', id);
}

/**
 * Kit's bot check: Kit's page, shown in a dialog, posts `ckjs:guard:confirmed`
 * (or `…:failed`) to this window once the person passes it, as Kit's own form
 * script (f.convertkit.com/ckjs/ck.5.js) expects. Escape gives up.
 */
function passCheck(url) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'padding:0;border:0;border-radius:8px;overflow:hidden';
    const frame = document.createElement('iframe');
    frame.title = 'A quick check before you sign up';
    frame.style.cssText = 'display:block;border:0;width:min(420px,90vw);height:min(560px,80vh)';
    frame.src = url;
    dialog.append(frame);
    const finish = (passed) => {
      window.removeEventListener('message', listen);
      dialog.remove();
      resolve(passed);
    };
    const listen = (event) => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.name === 'ckjs:guard:confirmed') finish(true);
      if (event.data?.name === 'ckjs:guard:failed') finish(false);
    };
    window.addEventListener('message', listen);
    dialog.addEventListener('cancel', () => finish(false));
    document.body.append(dialog);
    dialog.showModal();
  });
}

/**
 * Kit answers 200 with { status: 'success' }, { status: 'quarantined', url }
 * (the sign-up counts once the person passes the check at url) or
 * { status: 'failed', errors: { messages: [...] } }.
 */
async function subscribe(form, signup) {
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams({ email_address: input.value }) });
    const result = await response.json();
    const passed = result.status === 'success' || (result.status === 'quarantined' && (await passCheck(result.url)));
    if (passed) return showSuccess(form, signup.dataset.signupSuccess);
    showError(form, input, result.errors?.messages?.join(' ') || FAILED);
  } catch {
    showError(form, input, FAILED);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('submit', (event) => {
  const signup = event.target.closest?.('[data-signup-success]');
  if (!signup) return;
  event.preventDefault();
  subscribe(event.target, signup);
});
