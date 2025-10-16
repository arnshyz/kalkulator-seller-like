(function () {
  const STATUS_KEY = 'seller-tools-license-status';
  const CODE_KEY = 'seller-tools-license-code';
  const ACTIVATED_AT_KEY = 'seller-tools-license-activated-at';
  const VALID_CODES = ['SELLERPRO-2025', 'SELLER-TRIAL-7', 'PREMIUM-999'];

  function isActive() {
    return localStorage.getItem(STATUS_KEY) === 'active';
  }

  function getCode() {
    return localStorage.getItem(CODE_KEY) || null;
  }

  function notify() {
    document.dispatchEvent(
      new CustomEvent('seller-license-status', {
        detail: {
          active: isActive(),
          code: getCode(),
          activatedAt: localStorage.getItem(ACTIVATED_AT_KEY) || null,
        },
      })
    );
  }

  function activate(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { ok: false, message: 'Masukkan kode lisensi terlebih dahulu.' };
    }
    if (!VALID_CODES.includes(code)) {
      return { ok: false, message: 'Kode lisensi tidak ditemukan atau sudah kedaluwarsa.' };
    }
    localStorage.setItem(STATUS_KEY, 'active');
    localStorage.setItem(CODE_KEY, code);
    localStorage.setItem(ACTIVATED_AT_KEY, new Date().toISOString());
    notify();
    return { ok: true, code };
  }

  function deactivate() {
    localStorage.removeItem(STATUS_KEY);
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(ACTIVATED_AT_KEY);
    notify();
  }

  window.SellerLicense = {
    isActive,
    activate,
    deactivate,
    getCode,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notify, { once: true });
  } else {
    notify();
  }
})();
