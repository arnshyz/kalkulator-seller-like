(function () {
  const form = document.querySelector('[data-login-form]');
  const submitBtn = form ? form.querySelector('[data-login-submit]') : null;
  const submitLabel = form ? form.querySelector('[data-login-submit-label]') : null;
  const spinner = form ? form.querySelector('[data-login-spinner]') : null;
  const messageEl = form ? form.querySelector('[data-login-message]') : null;
  const codeInput = form ? form.querySelector('[name="accessCode"]') : null;
  const toggleBtn = form ? form.querySelector('[data-toggle-visibility]') : null;

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    if (submitLabel) submitLabel.textContent = isSubmitting ? 'Memproses...' : 'Masuk';
    if (spinner) spinner.classList.toggle('hidden', !isSubmitting);
  }

  function showMessage(text, status) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden', 'text-emerald-300', 'text-rose-300', 'text-slate-300');
    if (status === 'success') {
      messageEl.classList.add('text-emerald-300');
    } else if (status === 'neutral') {
      messageEl.classList.add('text-slate-300');
    } else {
      messageEl.classList.add('text-rose-300');
    }
  }

  if (toggleBtn && codeInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = codeInput.type === 'password';
      codeInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? 'Sembunyikan' : 'Tampilkan';
      toggleBtn.setAttribute('aria-label', isPassword ? 'Sembunyikan kode akses' : 'Tampilkan kode akses');
      codeInput.focus({ preventScroll: true });
    });
  }

  if (!form || !codeInput) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!window.AdminAuth) {
      showMessage('Modul autentikasi tidak tersedia.', 'error');
      return;
    }
    setSubmitting(true);
    showMessage('Memverifikasi kode akses...', 'neutral');
    const code = codeInput.value;

    window.setTimeout(() => {
      const result = window.AdminAuth.login(code);
      if (result.ok) {
        showMessage('Autentikasi berhasil. Mengalihkan ke dashboard...', 'success');
        window.setTimeout(() => {
          try {
            window.location.replace('./index.html');
          } catch (error) {
            window.location.href = './index.html';
          }
        }, 400);
      } else {
        showMessage(result.message || 'Kode akses tidak valid.', 'error');
        setSubmitting(false);
        codeInput.focus();
        codeInput.select();
      }
    }, 350);
  });
})();
