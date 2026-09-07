// src/utils/webViewAutofill.js
function core() {
  return `
  function post(payload) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload)); }
  function sleep(ms) { return new Promise(function(res){ setTimeout(res, ms); }); }
  function norm(s) { return (s || '').toString().trim().toLowerCase(); }

  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var st = window.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  }

  function setNativeInputValue(el, value) {
    var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setSelectByText(el, text) {
    var opts = Array.prototype.slice.call(el.options);
    var target = opts.find(function(o) { return norm(o.textContent) === norm(text); });
    if (!target) target = opts.find(function(o) { return norm(o.textContent).indexOf(norm(text)) !== -1; });
    if (!target) {
      try {
        el.focus();
        el.click();
        var mo = new MutationObserver(function() {
          var opts2 = Array.prototype.slice.call(el.options);
          var t2 = opts2.find(function(o) { return norm(o.textContent).indexOf(norm(text)) !== -1; });
          if (t2) {
            el.value = t2.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('input', { bubbles: true }));
            mo.disconnect();
          }
        });
        mo.observe(el, { childList: true, subtree: true });
        setTimeout(function() { mo.disconnect(); }, 2000);
        return false;
      } catch(e) { return false; }
    }
    el.value = target.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function waitForVisible(selector, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var start = Date.now();
      (function poll() {
        var el = document.querySelector(selector);
        if (el && isVisible(el)) return resolve(el);
        if (Date.now() - start > (timeoutMs || 4000)) return reject(new Error('timeout: ' + selector));
        setTimeout(poll, 150);
      })();
    });
  }

  function labelTextFor(el) {
    var texts = [];
    if (el.id) { try { var lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (lab) texts.push(lab.textContent); } catch(e){} }
    var wrap = el.closest('div,section,li,fieldset');
    if (wrap) { var lab2 = wrap.querySelector('label'); if (lab2) texts.push(lab2.textContent); }
    texts.push(el.getAttribute('placeholder') || '', el.getAttribute('aria-label') || '', el.getAttribute('name') || '', el.id || '');
    return norm(texts.join(' | '));
  }

  function fuzzyFindInput(hints) {
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select')
    ).filter(isVisible);
    var best = null, bestScore = 0;
    candidates.forEach(function(el) {
      var text = labelTextFor(el);
      (hints || []).forEach(function(h) {
        var hn = norm(h);
        if (hn && text.indexOf(hn) !== -1 && hn.length > bestScore) { bestScore = hn.length; best = el; }
      });
    });
    return best;
  }

  async function fillOne(f) {
    var el = null;
    try { el = await waitForVisible(f.selector, 4000); } catch (e) { el = null; }
    if (!el && f.fallbackHints) el = fuzzyFindInput(f.fallbackHints);
    if (!el) return false;

    if (f.type === 'select') {
      var ok = setSelectByText(el, f.value);
      if (!ok) {
        await sleep(300);
        var opts = Array.prototype.slice.call(el.options);
        var target = opts.find(function(o) { return norm(o.textContent).indexOf(norm(f.value)) !== -1; });
        if (target) {
          el.value = target.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          ok = true;
        }
      }
      return ok;
    }
    if (f.type === 'radio' || f.type === 'checkbox') {
      if (el.checked !== !!f.value) el.click();
      return true;
    }
    el.focus();
    setNativeInputValue(el, f.value);
    return true;
  }

  window.__cfAutofill = async function(fields) {
    var done = [], failed = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      try {
        var ok = await fillOne(f);
        await sleep(300);
        if (ok) done.push(f.label || f.selector); else failed.push(f.label || f.selector);
      } catch (e) {
        failed.push(f.label || f.selector);
      }
    }
    post({ type: 'CF_AUTOFILL_DONE', done: done, failed: failed });
  };

  function findButtonByText(text) {
    var groups = ['button', '[role="button"]', '.btn', 'a', 'span', 'div'];
    var t = norm(text);
    for (var g = 0; g < groups.length; g++) {
      var els = Array.prototype.slice.call(document.querySelectorAll(groups[g]));
      var exact = els.find(function(el) { return isVisible(el) && norm(el.textContent).trim() === t; });
      if (exact) return exact;
    }
    for (var g2 = 0; g2 < groups.length; g2++) {
      var els2 = Array.prototype.slice.call(document.querySelectorAll(groups[g2]));
      var partial = els2.find(function(el) {
        return isVisible(el) && norm(el.textContent).indexOf(t) !== -1 && el.textContent.trim().length < 30;
      });
      if (partial) return partial;
    }
    return null;
  }

  window.__cfClickNext = async function(buttonText, verifySelector) {
    await sleep(300);
    var btn = findButtonByText(buttonText || 'Next');
    if (!btn) { post({ type: 'CF_NEXT_NOT_FOUND' }); return false; }
    btn.click();
    await sleep(800);
    if (verifySelector) {
      var appeared = document.querySelector(verifySelector);
      if (!appeared || !isVisible(appeared)) { post({ type: 'CF_NEXT_BLOCKED' }); return false; }
    }
    post({ type: 'CF_NEXT_CLICKED' });
    return true;
  };
  `;
}

// ---------- Script builders ----------
export function buildRegisterAutofillScript(fields) {
  return `
  (async function() {
    try {
      ${core()}
      await window.__cfAutofill(${JSON.stringify(fields)});
    } catch (e) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cf_autofill_error', message: String(e) }));
    }
  })();
  true;`;
}

export function buildComplaintAutofillScript(phase1Fields, phase2Fields) {
  return `
  (async function() {
    try {
      ${core()}
      var phase2Marker = document.querySelector('#description') || document.querySelector('#urlContentInvolved0');
      var onPhase2 = phase2Marker && isVisible(phase2Marker);
      if (!onPhase2) {
        await window.__cfAutofill(${JSON.stringify(phase1Fields)});
        await window.__cfClickNext('Next', '#description, #urlContentInvolved0, textarea');
        await new Promise(function(r){ setTimeout(r, 700); });
      }
      await window.__cfAutofill(${JSON.stringify(phase2Fields)});
    } catch (e) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cf_autofill_error', message: String(e) }));
    }
  })();
  true;`;
}

export function buildFileInputWatcherScript() {
  return `
  (function() {
    try {
      function notify() {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cf_file_input_tapped' }));
      }
      function attach(el) {
        if (el.dataset.cfWatched) return;
        el.dataset.cfWatched = '1';
        el.addEventListener('click', notify);
        el.addEventListener('focus', notify);
      }
      Array.prototype.forEach.call(document.querySelectorAll('input[type=file]'), attach);
      var mo = new MutationObserver(function() {
        Array.prototype.forEach.call(document.querySelectorAll('input[type=file]'), attach);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    true;
  })();`;
}

export function buildInspectorScript() {
  return `
  (function() {
    try {
      var out = [];
      document.querySelectorAll('input, textarea, select, mat-select, .p-dropdown, .ng-select').forEach(function(el) {
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        out.push({
          tag: el.tagName,
          type: el.getAttribute('type') || '',
          id: el.id || '',
          name: el.getAttribute('name') || el.getAttribute('formcontrolname') || '',
          placeholder: el.getAttribute('placeholder') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          nearbyText: ((el.closest('div,section,li,fieldset') || {}).textContent || '').slice(0, 80)
        });
      });
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cf_inspect_result', fields: out }));
    } catch (e) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cf_inspect_error', message: String(e) }));
    }
    true;
  })();`;
}

// ---------- Save Button Watcher ----------
// Best-effort: MCMC's site is unreachable to inspect ahead of time, so this
// matches on Save-button TEXT rather than a known selector. Fires once per
// button per click; the RN side decides whether to act on it (only when
// we're not already on the New Case page).
export function buildSaveButtonWatcherScript() {
  return `
  (function() {
    try {
      function isSaveLabel(text) {
        var t = (text || '').trim().toLowerCase();
        return t === 'save' || t === 'save changes' || t === 'update' || t === 'simpan';
      }
      function notify() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CF_SAVE_CLICKED' }));
        }
      }
      function attach(el) {
        if (el.dataset.cfSaveWatched) return;
        el.dataset.cfSaveWatched = '1';
        el.addEventListener('click', notify);
      }
      function scan() {
        var candidates = document.querySelectorAll(
          'button, [role="button"], input[type=submit], input[type=button], a.btn, .btn'
        );
        Array.prototype.forEach.call(candidates, function(el) {
          var text = el.tagName === 'INPUT' ? (el.value || '') : (el.textContent || '');
          if (isSaveLabel(text)) attach(el);
        });
      }
      scan();
      var mo = new MutationObserver(scan);
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    true;
  })();`;
}

// ---------- Field builders ----------
export function buildComplaintFieldsPhase1({ form }) {
  return [
    { selector: '#complaintForMyself', value: true, type: 'radio', label: 'Complaint For' },
    { selector: '#mcmcRelatedComplaints', value: form?.mcmcRelated, type: 'select', label: 'MCMC Related' },
    { selector: '#typeOfService', value: form?.typeOfService, type: 'select', label: 'Type of Service' },
    { selector: '#category', value: form?.category, type: 'select', label: 'Category' },
    { selector: '#platformId', value: form?.platform, type: 'select', label: 'Platform' },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');
}

export function buildComplaintFieldsPhase2({ details }) {
  const PORTAL_REMEDIES = [
    'Access Restrictions',
    'Investigation',
    'Remove Content',
    'Request Information',
    'Other (please specify) i.e. Monitor.',
  ];
  const remedyMap = {
    'Delete Content': 'Remove Content',
    'Suspend Account': 'Access Restrictions',
    'Block User': 'Access Restrictions',
    'Legal Action': 'Investigation',
  };
  PORTAL_REMEDIES.forEach(r => { remedyMap[r] = r; });

  const fields = [
    {
      selector: '#urlContentInvolved0',
      value: details?.urlLink,
      type: 'text',
      label: 'URL of Content',
      fallbackHints: ['specific url', 'url of the content', 'url content involved'],
    },
    {
      selector: '#userNameIdInvolved',
      value: details?.userId,
      type: 'text',
      label: 'User ID',
      fallbackHints: ['user name', 'id of the account', 'username', 'user id'],
    },
    {
      selector: '#description',
      value: details?.description,
      type: 'text',
      label: 'Description',
      fallbackHints: ['complaint description', 'write your problem here', 'description'],
    },
  ];

  if (details?.remedyAction) {
    const mapped = remedyMap[details.remedyAction] || details.remedyAction;
    fields.push({
      selector: '#remedy',
      value: mapped,
      type: 'select',
      label: 'Remedy',
      fallbackHints: ['remedy'],
    });

    // If remedy is "Other", fill the remedyName textarea
    if (mapped === 'Other (please specify) i.e. Monitor.' && details?.remedyOther) {
      fields.push({
        selector: '#remedyName',
        value: details.remedyOther,
        type: 'text',
        label: 'Remedy Other',
        fallbackHints: ['please specify other remedy'],
      });
    }
  }

  // PWD checkbox
  if (details?.isPwd === true) {
    fields.push({
      selector: '#isPwd',
      value: true,
      type: 'checkbox',
      label: 'PWD',
    });
  }

  // Acknowledgement checkbox
  if (details?.isAcknowledged === true) {
    fields.push({
      selector: '#acknowledgement',
      value: true,
      type: 'checkbox',
      label: 'Acknowledgement',
    });
  }

  return fields.filter(f => f.value !== undefined && f.value !== null && f.value !== '');
}

export function buildRegisterFields({ details }) {
  return [
    { selector: '#email', value: details?.email, type: 'text', label: 'Email', fallbackHints: ['email'] },
    { selector: '#name', value: details?.fullName, type: 'text', label: 'Full Name', fallbackHints: ['full name'] },
    { selector: '#mobileNo', value: details?.mobileNumber, type: 'text', label: 'Mobile', fallbackHints: ['mobile number'] },
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');
}