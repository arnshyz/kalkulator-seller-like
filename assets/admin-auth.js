(function (global) {
  const SESSION_KEY = 'sellerToolkit.admin.session';
  const SESSION_VALUE = 'granted';
  const ACCESS_CODE = global.__SELLER_TOOLKIT_ADMIN_CODE__ || 'seller-toolkit-2024';

  function normalize(value) {
    return (value || '').trim();
  }

  function createSession() {
    try {
      global.localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ value: SESSION_VALUE, createdAt: Date.now() })
      );
    } catch (error) {
      global.__sellerToolkitAuthFallback = SESSION_VALUE;
    }
  }

  function readSessionRaw() {
    try {
      return global.localStorage.getItem(SESSION_KEY);
    } catch (error) {
      return global.__sellerToolkitAuthFallback || null;
    }
  }

  function clearSession() {
    try {
      global.localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      delete global.__sellerToolkitAuthFallback;
    }
  }

  function parseSession(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.value === SESSION_VALUE) {
        return parsed;
      }
      return null;
    } catch (error) {
      return raw === SESSION_VALUE ? { value: SESSION_VALUE } : null;
    }
  }

  const AdminAuth = {
    isAuthenticated() {
      return Boolean(parseSession(readSessionRaw()));
    },
    login(secret) {
      const code = normalize(secret);
      if (!code) {
        return { ok: false, message: 'Kode akses harus diisi.' };
      }
      if (code !== ACCESS_CODE) {
        return { ok: false, message: 'Kode akses salah. Periksa kembali atau hubungi pemilik sistem.' };
      }
      createSession();
      return { ok: true };
    },
    logout() {
      clearSession();
    },
    requireAuth(options = {}) {
      if (this.isAuthenticated()) {
        return true;
      }
      const { redirectTo = './login.html' } = options;
      try {
        global.location.replace(redirectTo);
      } catch (error) {
        global.location.href = redirectTo;
      }
      return false;
    },
    ensureLoggedOut(options = {}) {
      if (!this.isAuthenticated()) {
        return true;
      }
      const { redirectTo = './index.html' } = options;
      try {
        global.location.replace(redirectTo);
      } catch (error) {
        global.location.href = redirectTo;
      }
      return false;
    },
  };

  global.AdminAuth = AdminAuth;
})(window);
