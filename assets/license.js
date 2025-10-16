(function () {
  const STATUS_KEY = 'seller-tools-license-status';
  const CODE_KEY = 'seller-tools-license-code';
  const ACTIVATED_AT_KEY = 'seller-tools-license-activated-at';
  const CATALOG_KEY = 'seller-tools-license-catalog';
  const DAY_IN_MS = 86400000;

  function nowISO() {
    return new Date().toISOString();
  }

  function createDefaultCatalog() {
    const make = (id, code, label, type, durationDays, status, notes) => ({
      id,
      code,
      label,
      type,
      durationDays,
      status,
      notes,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });

    return [
      make(
        'lic-default-1',
        'SELLERPRO-2025',
        'Lisensi Premium Tahunan',
        'premium',
        365,
        'active',
        'Akses penuh semua kalkulator selama 12 bulan.'
      ),
      make(
        'lic-default-2',
        'SELLER-TRIAL-7',
        'Trial Premium 7 Hari',
        'trial',
        7,
        'active',
        'Trial standar untuk calon pelanggan baru.'
      ),
      make(
        'lic-default-3',
        'PREMIUM-999',
        'Lisensi Lifetime 999',
        'premium',
        null,
        'inactive',
        'Aktifkan manual untuk promo lifetime.'
      ),
    ];
  }

  function normalizeLicense(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const code = (entry.code || '').trim().toUpperCase();
    if (!code) return null;

    const duration = Number(entry.durationDays);
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;

    return {
      id: entry.id || generateId(),
      code,
      label: (entry.label || code).trim() || code,
      type: entry.type === 'trial' ? 'trial' : 'premium',
      status: entry.status === 'inactive' ? 'inactive' : 'active',
      durationDays: normalizedDuration,
      notes: typeof entry.notes === 'string' ? entry.notes : '',
      createdAt: entry.createdAt || nowISO(),
      updatedAt: entry.updatedAt || entry.createdAt || nowISO(),
    };
  }

  function loadCatalogRaw() {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn('SellerLicense: gagal membaca katalog lisensi', error);
      return null;
    }
  }

  function ensureCatalog() {
    const rawList = loadCatalogRaw();
    if (rawList === null) {
      const defaults = createDefaultCatalog();
      localStorage.setItem(CATALOG_KEY, JSON.stringify(defaults));
      return defaults.slice();
    }
    return rawList.map((item) => normalizeLicense(item)).filter(Boolean);
  }

  function cloneCatalog(list) {
    return list.map((license) => ({ ...license }));
  }

  function buildSummary(list) {
    return list.reduce(
      (acc, license) => {
        acc.total += 1;
        if (license.status === 'active') {
          acc.active += 1;
          if (license.type === 'trial') {
            acc.trialActive += 1;
          } else {
            acc.premiumActive += 1;
          }
        } else {
          acc.inactive += 1;
        }

        if (license.type === 'trial') {
          acc.trial += 1;
        } else {
          acc.premium += 1;
        }
        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
        trial: 0,
        trialActive: 0,
        premium: 0,
        premiumActive: 0,
      }
    );
  }

  function dispatchCatalog(list) {
    const snapshot = cloneCatalog(list);
    document.dispatchEvent(
      new CustomEvent('seller-license-catalog', {
        detail: {
          licenses: snapshot,
          summary: buildSummary(snapshot),
        },
      })
    );
  }

  function computeExpiration(license, activatedAt) {
    if (!license || !activatedAt) return null;
    const duration = Number(license.durationDays);
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const start = new Date(activatedAt);
    if (Number.isNaN(start.getTime())) return null;
    const expires = new Date(start.getTime() + duration * DAY_IN_MS);
    return expires.toISOString();
  }

  function syncStoredStatus(status) {
    const value = status || 'inactive';
    localStorage.setItem(STATUS_KEY, value);
  }

  function getStatusDetail() {
    const catalog = ensureCatalog();
    const code = getCode();
    const rawStatus = localStorage.getItem(STATUS_KEY) || 'inactive';
    const activatedAt = localStorage.getItem(ACTIVATED_AT_KEY) || null;
    const license = code ? catalog.find((item) => item.code === code) || null : null;

    let status = rawStatus;
    let active = rawStatus === 'active';
    let expiresAt = computeExpiration(license, activatedAt);

    if (!code) {
      active = false;
      status = 'inactive';
      expiresAt = null;
    } else if (!license) {
      active = false;
      status = 'invalid';
      expiresAt = null;
    } else if (license.status !== 'active') {
      active = false;
      status = 'disabled';
      expiresAt = null;
    } else if (expiresAt) {
      const expireTime = Date.parse(expiresAt);
      if (!Number.isFinite(expireTime)) {
        expiresAt = null;
      } else if (expireTime <= Date.now()) {
        active = false;
        status = 'expired';
      }
    }

    if (active) {
      status = 'active';
    }

    syncStoredStatus(status);

    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / DAY_IN_MS))
      : null;

    return {
      active,
      status,
      code: code || null,
      activatedAt,
      expiresAt,
      daysRemaining,
      licenseType: license?.type || null,
      licenseLabel: license?.label || null,
      durationDays: license?.durationDays ?? null,
      notes: license?.notes || '',
      isTrial: license?.type === 'trial',
    };
  }

  function notify() {
    const detail = getStatusDetail();
    document.dispatchEvent(
      new CustomEvent('seller-license-status', {
        detail,
      })
    );
  }

  function saveCatalog(list) {
    const normalized = list.map((item) => normalizeLicense(item)).filter(Boolean);
    localStorage.setItem(CATALOG_KEY, JSON.stringify(normalized));
    dispatchCatalog(normalized);
    notify();
    return normalized;
  }

  function getCatalog() {
    const catalog = ensureCatalog();
    return catalog
      .slice()
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || '') || 0;
        const bTime = Date.parse(b.updatedAt || '') || 0;
        return bTime - aTime;
      })
      .map((item) => ({ ...item }));
  }

  function generateId() {
    return `lic-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`.toUpperCase();
  }

  function saveLicense(input) {
    const catalog = ensureCatalog();
    const payload = input || {};
    const code = (payload.code || '').trim().toUpperCase();
    const labelInput = (payload.label || '').trim();
    const label = labelInput || code;
    const type = payload.type === 'trial' ? 'trial' : 'premium';
    const status = payload.status === 'inactive' ? 'inactive' : 'active';
    const notes = typeof payload.notes === 'string' ? payload.notes.trim() : '';
    const durationRaw = Number(payload.durationDays);
    const durationDays = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : null;

    if (!code) {
      return { ok: false, message: 'Kode lisensi wajib diisi.' };
    }
    if (type === 'trial' && (!durationDays || durationDays < 1)) {
      return { ok: false, message: 'Lisensi trial wajib memiliki durasi minimal 1 hari.' };
    }

    const duplicate = catalog.find((item) => item.code === code && item.id !== payload.id);
    if (duplicate) {
      return { ok: false, message: 'Kode lisensi sudah digunakan lisensi lain.' };
    }

    const now = nowISO();
    const idx = payload.id ? catalog.findIndex((item) => item.id === payload.id) : -1;

    if (idx === -1) {
      const created = normalizeLicense({
        id: generateId(),
        code,
        label,
        type,
        status,
        durationDays,
        notes,
        createdAt: now,
        updatedAt: now,
      });
      catalog.push(created);
      const normalized = saveCatalog(catalog);
      const stored = normalized.find((item) => item.id === created.id);
      return { ok: true, license: stored ? { ...stored } : { ...created }, created: true };
    }

    const current = catalog[idx];
    const updated = normalizeLicense({
      ...current,
      code,
      label,
      type,
      status,
      durationDays,
      notes,
      updatedAt: now,
    });
    catalog[idx] = updated;
    const normalized = saveCatalog(catalog);
    const stored = normalized.find((item) => item.id === updated.id);
    return { ok: true, license: stored ? { ...stored } : { ...updated }, created: false };
  }

  function deleteLicense(id) {
    if (!id) {
      return { ok: false, message: 'ID lisensi tidak ditemukan.' };
    }
    const catalog = ensureCatalog();
    const idx = catalog.findIndex((item) => item.id === id);
    if (idx === -1) {
      return { ok: false, message: 'Lisensi tidak ditemukan.' };
    }
    const [removed] = catalog.splice(idx, 1);
    saveCatalog(catalog);
    return { ok: true, license: { ...removed } };
  }

  function setLicenseStatus(id, nextStatus) {
    if (!id) {
      return { ok: false, message: 'ID lisensi tidak ditemukan.' };
    }
    const status = nextStatus === 'inactive' ? 'inactive' : 'active';
    const catalog = ensureCatalog();
    const idx = catalog.findIndex((item) => item.id === id);
    if (idx === -1) {
      return { ok: false, message: 'Lisensi tidak ditemukan.' };
    }
    if (catalog[idx].status === status) {
      return { ok: true, license: { ...catalog[idx] } };
    }
    catalog[idx] = {
      ...catalog[idx],
      status,
      updatedAt: nowISO(),
    };
    const normalized = saveCatalog(catalog);
    const stored = normalized.find((item) => item.id === id);
    return { ok: true, license: stored ? { ...stored } : { ...catalog[idx] } };
  }

  function getCode() {
    return localStorage.getItem(CODE_KEY) || null;
  }

  function isActive() {
    return getStatusDetail().active;
  }

  function activate(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { ok: false, message: 'Masukkan kode lisensi terlebih dahulu.' };
    }

    const catalog = ensureCatalog();
    const license = catalog.find((item) => item.code === code);
    if (!license) {
      return { ok: false, message: 'Kode lisensi tidak ditemukan atau sudah kedaluwarsa.' };
    }
    if (license.status !== 'active') {
      return { ok: false, message: 'Lisensi ini sedang dinonaktifkan. Hubungi admin untuk mengaktifkan kembali.' };
    }
    if (license.type === 'trial' && (!license.durationDays || license.durationDays < 1)) {
      return { ok: false, message: 'Durasi lisensi trial belum dikonfigurasi.' };
    }

    const activatedAt = nowISO();
    localStorage.setItem(CODE_KEY, license.code);
    localStorage.setItem(ACTIVATED_AT_KEY, activatedAt);
    localStorage.setItem(STATUS_KEY, 'active');
    notify();

    return {
      ok: true,
      code: license.code,
      expiresAt: computeExpiration(license, activatedAt),
      type: license.type,
    };
  }

  function deactivate() {
    localStorage.setItem(STATUS_KEY, 'inactive');
    localStorage.removeItem(CODE_KEY);
    localStorage.removeItem(ACTIVATED_AT_KEY);
    notify();
  }

  function getStatus() {
    return getStatusDetail();
  }

  window.SellerLicense = {
    isActive,
    activate,
    deactivate,
    getCode,
    getStatus,
    getCatalog,
    saveLicense,
    deleteLicense,
    setLicenseStatus,
  };

  const initialCatalog = ensureCatalog();
  dispatchCatalog(initialCatalog);
  notify();
})();
