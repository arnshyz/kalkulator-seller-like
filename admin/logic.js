(function () {
  if (window.AdminAuth) {
    window.AdminAuth.requireAuth({ redirectTo: './login.html' });
  }

  const summaryEls = {
    total: document.querySelector('[data-summary-total]'),
    active: document.querySelector('[data-summary-active]'),
    inactive: document.querySelector('[data-summary-inactive]'),
    trialActive: document.querySelector('[data-summary-trial-active]'),
    trialTotal: document.querySelector('[data-summary-trial-total]'),
    premiumActive: document.querySelector('[data-summary-premium-active]'),
    premiumTotal: document.querySelector('[data-summary-premium-total]'),
  };

  const tableBody = document.querySelector('[data-license-table]');
  const newButton = document.querySelector('[data-new-license]');
  const currentYearEl = document.querySelector('[data-current-year]');

  const form = document.getElementById('licenseForm');
  const formTitle = document.querySelector('[data-form-title]');
  const formCaption = document.querySelector('[data-form-caption]');
  const formMessage = document.querySelector('[data-form-message]');
  const durationTitle = form ? form.querySelector('[data-duration-title]') : null;
  const durationHint = document.querySelector('[data-duration-hint]');
  const resetFormBtn = document.querySelector('[data-reset-form]');

  const fields = {
    id: form ? form.querySelector('[name="licenseId"]') : null,
    code: form ? form.querySelector('[name="licenseCode"]') : null,
    label: form ? form.querySelector('[name="licenseLabel"]') : null,
    type: form ? form.querySelector('[name="licenseType"]') : null,
    duration: form ? form.querySelector('[name="licenseDuration"]') : null,
    status: form ? form.querySelector('[name="licenseStatus"]') : null,
    notes: form ? form.querySelector('[name="licenseNotes"]') : null,
  };

  const deviceEls = {
    title: document.querySelector('[data-device-title]'),
    caption: document.querySelector('[data-device-caption]'),
    badge: document.querySelector('[data-device-badge]'),
    code: document.querySelector('[data-device-code]'),
    type: document.querySelector('[data-device-type]'),
    activated: document.querySelector('[data-device-activated]'),
    expiry: document.querySelector('[data-device-expiry]'),
    countdown: document.querySelector('[data-device-countdown]'),
    message: document.querySelector('[data-device-message]'),
  };
  const deviceResetBtn = document.querySelector('[data-device-reset]');

  const syncEls = {
    exportField: document.querySelector('[data-export-field]'),
    copyExport: document.querySelector('[data-copy-export]'),
    refreshExport: document.querySelector('[data-refresh-export]'),
    importField: document.querySelector('[data-import-field]'),
    importMerge: document.querySelector('[data-import-merge]'),
    importReplace: document.querySelector('[data-import-replace]'),
    importMessage: document.querySelector('[data-import-message]'),
  };

  const logoutBtn = document.querySelector('[data-logout]');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.AdminAuth) {
        window.AdminAuth.logout();
      } else {
        try {
          window.localStorage.removeItem('sellerToolkit.admin.session');
        } catch (error) {
          // ignore
        }
      }
      try {
        window.location.replace('./login.html');
      } catch (error) {
        window.location.href = './login.html';
      }
    });
  }

  let editingId = null;
  let cachedCatalog = [];
  let deviceMessageTimer = null;

  const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' });

  function summarize(licenses) {
    return (licenses || []).reduce(
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
          acc.trialTotal += 1;
        } else {
          acc.premiumTotal += 1;
        }
        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
        trialActive: 0,
        trialTotal: 0,
        premiumActive: 0,
        premiumTotal: 0,
      }
    );
  }

  function renderSummary(summary) {
    if (!summary) return;
    if (summaryEls.total) summaryEls.total.textContent = summary.total;
    if (summaryEls.active) summaryEls.active.textContent = summary.active;
    if (summaryEls.inactive) summaryEls.inactive.textContent = summary.inactive;
    if (summaryEls.trialActive) summaryEls.trialActive.textContent = summary.trialActive;
    if (summaryEls.trialTotal) summaryEls.trialTotal.textContent = summary.trialTotal;
    if (summaryEls.premiumActive) summaryEls.premiumActive.textContent = summary.premiumActive;
    if (summaryEls.premiumTotal) summaryEls.premiumTotal.textContent = summary.premiumTotal;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    try {
      return dateTimeFormatter.format(date);
    } catch (error) {
      return date.toLocaleString('id-ID');
    }
  }

  function formatDateShort(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    try {
      return dateFormatter.format(date);
    } catch (error) {
      return date.toLocaleDateString('id-ID');
    }
  }

  function clearFormMessage() {
    if (!formMessage) return;
    formMessage.classList.add('hidden');
    formMessage.textContent = '';
    formMessage.classList.remove('text-emerald-300', 'text-rose-300');
  }

  function showFormMessage(text, isSuccess) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.classList.remove('hidden', 'text-emerald-300', 'text-rose-300');
    formMessage.classList.add(isSuccess ? 'text-emerald-300' : 'text-rose-300');
  }

  function showDeviceMessage(text, isSuccess) {
    const messageEl = deviceEls.message;
    if (!messageEl) return;
    if (deviceMessageTimer) {
      window.clearTimeout(deviceMessageTimer);
      deviceMessageTimer = null;
    }
    messageEl.textContent = text;
    messageEl.classList.remove('hidden', 'text-emerald-300', 'text-rose-300');
    messageEl.classList.add(isSuccess ? 'text-emerald-300' : 'text-rose-300');
    deviceMessageTimer = window.setTimeout(() => {
      messageEl.classList.add('hidden');
    }, 4000);
  }

  function showImportMessage(text, isSuccess) {
    const messageEl = syncEls.importMessage;
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.classList.remove('hidden', 'text-emerald-300', 'text-rose-300');
    messageEl.classList.add(isSuccess ? 'text-emerald-300' : 'text-rose-300');
  }

  function updateDurationMeta(typeValue) {
    const type = typeValue === 'trial' ? 'trial' : 'premium';
    if (durationTitle) {
      durationTitle.textContent = type === 'trial' ? 'Durasi Trial (hari)' : 'Durasi Aktif (hari)';
    }
    if (durationHint) {
      durationHint.textContent =
        type === 'trial'
          ? 'Trial wajib minimal 1 hari. Nilai menentukan lamanya masa percobaan.'
          : 'Isi 0 untuk lisensi tanpa batas waktu aktif.';
    }
    if (type === 'premium' && fields.duration && !fields.duration.value) {
      fields.duration.value = '';
    }
  }

  function resetForm() {
    if (form) form.reset();
    editingId = null;
    if (fields.id) fields.id.value = '';
    if (fields.duration) fields.duration.value = '';
    if (fields.status) fields.status.value = 'active';
    if (formTitle) formTitle.textContent = 'Tambah Lisensi Baru';
    if (formCaption) {
      formCaption.textContent =
        'Isi detail lisensi lalu tekan simpan. Kode akan otomatis tersimpan ke perangkat admin.';
    }
    updateDurationMeta(fields.type ? fields.type.value : 'premium');
    clearFormMessage();
  }

  function refreshExportField() {
    if (!syncEls.exportField) return;
    const value = window.SellerLicense?.exportCatalog
      ? window.SellerLicense.exportCatalog({ format: 'base64' })
      : '';
    syncEls.exportField.value = value || '';
  }

  function copyExportString() {
    if (!syncEls.exportField) return;
    const text = syncEls.exportField.value || '';
    if (!text) {
      showImportMessage('Tidak ada data lisensi untuk disalin.', false);
      return;
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showImportMessage('String lisensi disalin. Tempel di halaman utama untuk sinkron.', true);
        })
        .catch(() => {
          showImportMessage('Gagal menyalin string. Salin secara manual.', false);
        });
      return;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showImportMessage('String lisensi disalin. Tempel di halaman utama untuk sinkron.', true);
    } catch (error) {
      showImportMessage('Gagal menyalin string. Salin secara manual.', false);
    }
  }

  function handleImport(mode) {
    if (!syncEls.importField) return;
    if (!window.SellerLicense?.importCatalog) {
      showImportMessage('Fungsi impor lisensi tidak tersedia.', false);
      return;
    }
    const raw = syncEls.importField.value || '';
    if (!raw.trim()) {
      showImportMessage('Tempel string lisensi terlebih dahulu.', false);
      return;
    }
    const result = window.SellerLicense.importCatalog(raw, { mode });
    if (!result.ok) {
      showImportMessage(result.message || 'Gagal mengimpor lisensi.', false);
      return;
    }
    refreshExportField();
    syncEls.importField.value = '';
    const importedCount = result.imported?.length || 0;
    const previousTotal = Number.isFinite(result.previousTotal) ? result.previousTotal : cachedCatalog.length;
    const totalNow = result.total ?? previousTotal;
    const delta = totalNow - previousTotal;
    const actionLabel = mode === 'replace' ? 'mengganti' : 'menggabungkan';
    const deltaLabel = delta === 0 ? '0' : `${delta > 0 ? '+' : ''}${delta}`;
    showImportMessage(
      `Berhasil ${actionLabel} ${importedCount} lisensi (Δ ${deltaLabel}). Total sekarang ${totalNow} item.`,
      true
    );
  }

  function fillForm(license, options = {}) {
    if (!form || !license) return;
    editingId = license.id;
    if (fields.id) fields.id.value = license.id || '';
    if (fields.code) fields.code.value = license.code || '';
    if (fields.label) fields.label.value = license.label || '';
    if (fields.type) fields.type.value = license.type === 'trial' ? 'trial' : 'premium';
    if (fields.status) fields.status.value = license.status === 'inactive' ? 'inactive' : 'active';
    if (fields.notes) fields.notes.value = license.notes || '';
    if (fields.duration) {
      if (license.type === 'trial') {
        fields.duration.value = license.durationDays && license.durationDays > 0 ? license.durationDays : '';
      } else {
        fields.duration.value = license.durationDays && license.durationDays > 0 ? license.durationDays : 0;
      }
    }
    updateDurationMeta(fields.type ? fields.type.value : 'premium');
    if (!options.preserveMessage) {
      clearFormMessage();
    }
    if (formTitle) formTitle.textContent = `Edit Lisensi: ${license.code}`;
    if (formCaption) {
      formCaption.textContent = license.label
        ? `Mengatur lisensi “${license.label}”. Simpan untuk memperbarui katalog.`
        : 'Perbarui detail lisensi dan tekan simpan.';
    }
    if (!options.skipScroll) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function createTableRow(license) {
    const row = document.createElement('tr');
    row.className = 'transition hover:bg-white/10';

    const codeCell = document.createElement('td');
    codeCell.className = 'whitespace-nowrap px-4 py-3';
    const codePrimary = document.createElement('div');
    codePrimary.className = 'text-sm font-semibold text-white';
    codePrimary.textContent = license.code;
    const codeSecondary = document.createElement('div');
    codeSecondary.className = 'text-xs text-slate-400';
    codeSecondary.textContent = license.label || '—';
    codeCell.append(codePrimary, codeSecondary);

    const typeCell = document.createElement('td');
    typeCell.className = 'whitespace-nowrap px-4 py-3';
    const typeBadge = document.createElement('span');
    typeBadge.className =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]';
    if (license.type === 'trial') {
      typeBadge.classList.add('border-amber-400/40', 'bg-amber-400/10', 'text-amber-100');
      typeBadge.textContent = 'Trial';
    } else {
      typeBadge.classList.add('border-indigo-400/40', 'bg-indigo-400/10', 'text-indigo-100');
      typeBadge.textContent = 'Premium';
    }
    const durationText = document.createElement('p');
    durationText.className = 'mt-2 text-xs text-slate-400';
    if (license.durationDays && license.durationDays > 0) {
      durationText.textContent = `Durasi: ${license.durationDays} hari`;
    } else if (license.type === 'trial') {
      durationText.textContent = 'Durasi: belum diatur';
      durationText.classList.add('text-amber-300');
    } else {
      durationText.textContent = 'Durasi: tanpa batas';
    }
    typeCell.append(typeBadge, durationText);

    const statusCell = document.createElement('td');
    statusCell.className = 'whitespace-nowrap px-4 py-3';
    const statusBadge = document.createElement('span');
    statusBadge.className =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]';
    const statusDot = document.createElement('span');
    statusDot.className = 'h-2 w-2 rounded-full';
    if (license.status === 'active') {
      statusBadge.classList.add('border-emerald-400/40', 'bg-emerald-400/10', 'text-emerald-100');
      statusDot.classList.add('bg-emerald-300');
      statusBadge.append(statusDot, document.createTextNode('Aktif'));
    } else {
      statusBadge.classList.add('border-white/10', 'bg-white/5', 'text-slate-200');
      statusDot.classList.add('bg-slate-400');
      statusBadge.append(statusDot, document.createTextNode('Nonaktif'));
    }
    statusCell.append(statusBadge);

    const updateCell = document.createElement('td');
    updateCell.className = 'whitespace-nowrap px-4 py-3 text-xs text-slate-300';
    updateCell.textContent = formatDate(license.updatedAt);
    if (license.updatedAt) {
      updateCell.title = formatDate(license.updatedAt);
    }

    const notesCell = document.createElement('td');
    notesCell.className = 'px-4 py-3 text-xs text-slate-300';
    if (license.notes) {
      notesCell.textContent = license.notes;
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'text-slate-500 italic';
      placeholder.textContent = 'Tidak ada catatan';
      notesCell.appendChild(placeholder);
    }

    const actionsCell = document.createElement('td');
    actionsCell.className = 'whitespace-nowrap px-4 py-3 text-right';
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'flex justify-end gap-2';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = license.id;
    editButton.className = 'rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white';
    editButton.textContent = 'Sunting';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.dataset.action = 'toggle';
    toggleButton.dataset.id = license.id;
    toggleButton.dataset.next = license.status === 'active' ? 'inactive' : 'active';
    toggleButton.className = license.status === 'active'
      ? 'rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-400/60'
      : 'rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:border-emerald-400/60';
    toggleButton.textContent = license.status === 'active' ? 'Nonaktifkan' : 'Aktifkan';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = license.id;
    deleteButton.className = 'rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:border-rose-400/60';
    deleteButton.textContent = 'Hapus';

    actionsWrapper.append(editButton, toggleButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);

    row.append(codeCell, typeCell, statusCell, updateCell, notesCell, actionsCell);
    return row;
  }

  function renderTable(licenses) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!licenses || licenses.length === 0) {
      const emptyRow = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.className = 'px-4 py-6 text-center text-sm text-slate-400';
      cell.textContent = 'Belum ada lisensi yang tersimpan.';
      emptyRow.appendChild(cell);
      tableBody.appendChild(emptyRow);
      return;
    }

    const sorted = licenses
      .slice()
      .sort((a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0));

    sorted.forEach((license) => {
      tableBody.appendChild(createTableRow(license));
    });
  }

  function renderCatalog(licenses, summary) {
    cachedCatalog = Array.isArray(licenses) ? licenses.map((item) => ({ ...item })) : [];
    renderTable(cachedCatalog);
    if (summary) {
      renderSummary(summary);
    } else {
      renderSummary(summarize(cachedCatalog));
    }
    if (editingId) {
      const current = cachedCatalog.find((item) => item.id === editingId);
      if (current) {
        fillForm(current, { preserveMessage: true, skipScroll: true });
      }
    }
  }

  function handleTableAction(event) {
    const target = event.target.closest('[data-action]');
    if (!target || !tableBody.contains(target)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    const license = cachedCatalog.find((item) => item.id === id);

    if (action === 'edit') {
      if (license) {
        fillForm(license);
      }
      return;
    }

    if (action === 'toggle') {
      const nextStatus = target.dataset.next === 'inactive' ? 'inactive' : 'active';
      const result = window.SellerLicense?.setLicenseStatus?.(id, nextStatus);
      if (!result || !result.ok) {
        showFormMessage(result?.message || 'Gagal memperbarui status lisensi.', false);
      } else {
        editingId = id;
        showFormMessage(
          nextStatus === 'active' ? 'Lisensi diaktifkan.' : 'Lisensi dinonaktifkan.',
          true
        );
      }
      return;
    }

    if (action === 'delete') {
      if (!license) return;
      const confirmation = window.confirm(`Hapus lisensi ${license.code}?`);
      if (!confirmation) return;
      const result = window.SellerLicense?.deleteLicense?.(id);
      if (!result || !result.ok) {
        showFormMessage(result?.message || 'Gagal menghapus lisensi.', false);
      } else {
        if (editingId === id) {
          resetForm();
        }
        showFormMessage(`Lisensi ${license.code} telah dihapus.`, true);
      }
    }
  }

  function renderDeviceStatus(detail) {
    const statusDetail = detail || {};
    const status = statusDetail.status || 'inactive';
    const active = Boolean(statusDetail.active);
    const badge = deviceEls.badge;
    const titleEl = deviceEls.title;
    const captionEl = deviceEls.caption;
    const codeEl = deviceEls.code;
    const typeEl = deviceEls.type;
    const activatedEl = deviceEls.activated;
    const expiryEl = deviceEls.expiry;
    const countdownEl = deviceEls.countdown;

    const baseBadgeClass =
      'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em]';
    let badgeClasses = [baseBadgeClass, 'border-white/10', 'bg-white/5', 'text-slate-200'];
    let badgeText = 'Tidak Aktif';

    if (status === 'active' && statusDetail.isTrial) {
      badgeClasses = [baseBadgeClass, 'border-amber-400/40', 'bg-amber-400/10', 'text-amber-100'];
      badgeText = 'Trial Aktif';
    } else if (status === 'active') {
      badgeClasses = [baseBadgeClass, 'border-emerald-400/40', 'bg-emerald-400/10', 'text-emerald-100'];
      badgeText = 'Premium Aktif';
    } else if (status === 'expired') {
      badgeClasses = [baseBadgeClass, 'border-rose-400/40', 'bg-rose-400/10', 'text-rose-100'];
      badgeText = 'Trial Kedaluwarsa';
    } else if (status === 'disabled') {
      badgeClasses = [baseBadgeClass, 'border-amber-400/40', 'bg-amber-400/10', 'text-amber-100'];
      badgeText = 'Dinonaktifkan';
    } else if (status === 'invalid') {
      badgeClasses = [baseBadgeClass, 'border-rose-400/40', 'bg-rose-400/10', 'text-rose-100'];
      badgeText = 'Kode Tidak Ditemukan';
    }

    if (badge) {
      badge.className = badgeClasses.join(' ');
      badge.textContent = badgeText;
    }

    let titleText = 'Perangkat belum memiliki lisensi';
    let captionText = 'Aktifkan lisensi untuk melihat masa berlaku di sini.';

    if (active && statusDetail.isTrial) {
      titleText = statusDetail.daysRemaining != null
        ? `Trial aktif (${statusDetail.daysRemaining} hari tersisa)`
        : 'Trial premium aktif';
      captionText = statusDetail.expiresAt
        ? `Trial akan berakhir pada ${formatDate(statusDetail.expiresAt)}.`
        : 'Periksa konfigurasi durasi trial untuk memastikan tanggal berakhir.';
    } else if (active) {
      titleText = 'Lisensi premium aktif';
      captionText = statusDetail.licenseLabel
        ? `Paket ${statusDetail.licenseLabel} sedang berjalan tanpa hambatan.`
        : 'Akses penuh ke seluruh kalkulator telah dibuka.';
    } else if (status === 'expired') {
      titleText = 'Trial telah berakhir';
      captionText = statusDetail.expiresAt
        ? `Trial kedaluwarsa pada ${formatDate(statusDetail.expiresAt)}. Aktifkan kode baru untuk lanjut.`
        : 'Trial kedaluwarsa. Tambahkan lisensi baru untuk perangkat ini.';
    } else if (status === 'disabled') {
      titleText = 'Lisensi dinonaktifkan';
      captionText = 'Aktifkan kembali lisensi dari katalog atau berikan kode baru.';
    } else if (status === 'invalid' && statusDetail.code) {
      titleText = 'Kode tidak tersedia di katalog';
      captionText = 'Tambahkan kode tersebut ke katalog atau reset lisensi perangkat.';
    }

    if (titleEl) titleEl.textContent = titleText;
    if (captionEl) captionEl.textContent = captionText;

    if (codeEl) codeEl.textContent = statusDetail.code || '—';
    if (typeEl) {
      if (statusDetail.licenseType === 'trial') {
        typeEl.textContent = 'Trial';
      } else if (statusDetail.licenseType === 'premium') {
        typeEl.textContent = 'Premium';
      } else {
        typeEl.textContent = '—';
      }
    }
    if (activatedEl) activatedEl.textContent = formatDate(statusDetail.activatedAt);

    if (expiryEl) {
      if (statusDetail.expiresAt) {
        expiryEl.textContent = formatDate(statusDetail.expiresAt);
      } else if (statusDetail.licenseType === 'premium' && statusDetail.code) {
        expiryEl.textContent = 'Tanpa batas';
      } else {
        expiryEl.textContent = '—';
      }
    }

    if (countdownEl) {
      if (statusDetail.daysRemaining != null) {
        countdownEl.textContent = `${statusDetail.daysRemaining} hari tersisa`;
      } else if (status === 'expired' && statusDetail.expiresAt) {
        countdownEl.textContent = `Berakhir pada ${formatDateShort(statusDetail.expiresAt)}`;
      } else if (!statusDetail.code) {
        countdownEl.textContent = 'Belum ada lisensi aktif.';
      } else {
        countdownEl.textContent = 'Tidak ada batas waktu.';
      }
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!window.SellerLicense?.saveLicense) {
      showFormMessage('Fungsi lisensi tidak tersedia.', false);
      return;
    }

    const payload = {
      id: fields.id?.value || undefined,
      code: fields.code?.value || '',
      label: fields.label?.value || '',
      type: fields.type?.value || 'premium',
      durationDays: fields.duration?.value,
      status: fields.status?.value || 'active',
      notes: fields.notes?.value || '',
    };

    const durationValue = payload.durationDays;
    payload.durationDays = durationValue === '' || durationValue == null ? null : Number(durationValue);

    const result = window.SellerLicense.saveLicense(payload);
    if (!result || !result.ok) {
      showFormMessage(result?.message || 'Gagal menyimpan lisensi.', false);
      return;
    }

    if (result.license) {
      editingId = result.license.id;
      fillForm(result.license, { preserveMessage: true, skipScroll: true });
    } else if (result.created) {
      editingId = null;
      resetForm();
    }

    showFormMessage(
      result.created ? 'Lisensi baru berhasil ditambahkan.' : 'Perubahan lisensi telah disimpan.',
      true
    );
  }

  function handleTypeChange() {
    updateDurationMeta(fields.type ? fields.type.value : 'premium');
  }

  function handleNewButton() {
    resetForm();
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleDeviceReset() {
    if (!window.SellerLicense?.deactivate) return;
    window.SellerLicense.deactivate();
    showDeviceMessage('Lisensi perangkat telah direset.', true);
  }

  document.addEventListener('seller-license-catalog', (event) => {
    const detail = event.detail || {};
    renderCatalog(detail.licenses || [], detail.summary);
    refreshExportField();
  });

  document.addEventListener('seller-license-status', (event) => {
    renderDeviceStatus(event.detail || {});
  });

  if (tableBody) {
    tableBody.addEventListener('click', handleTableAction);
  }

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (fields.type) {
    fields.type.addEventListener('change', handleTypeChange);
  }

  if (resetFormBtn) {
    resetFormBtn.addEventListener('click', () => {
      resetForm();
    });
  }

  if (newButton) {
    newButton.addEventListener('click', handleNewButton);
  }

  if (deviceResetBtn) {
    deviceResetBtn.addEventListener('click', handleDeviceReset);
  }

  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // Initial render
  if (window.SellerLicense?.getCatalog) {
    renderCatalog(window.SellerLicense.getCatalog());
  }
  refreshExportField();
  if (window.SellerLicense?.getStatus) {
    renderDeviceStatus(window.SellerLicense.getStatus());
  }
  updateDurationMeta(fields.type ? fields.type.value : 'premium');

  if (syncEls.copyExport) {
    syncEls.copyExport.addEventListener('click', copyExportString);
  }
  if (syncEls.refreshExport) {
    syncEls.refreshExport.addEventListener('click', refreshExportField);
  }
  if (syncEls.importMerge) {
    syncEls.importMerge.addEventListener('click', () => handleImport('merge'));
  }
  if (syncEls.importReplace) {
    syncEls.importReplace.addEventListener('click', () => handleImport('replace'));
  }
})();
