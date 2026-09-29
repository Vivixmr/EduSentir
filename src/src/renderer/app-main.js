const state = {
  currentUser: null,
  dashboard: null,
  users: [],
  students: [],
  report: null,
  reportHtml: null,
  reportPdfUrl: null,
  reportPdfFileName: null,
  reportPdfBase64: null,
  selectedObservationId: null,
  selectedRegistrationKey: null,
  activeView: "dashboard",
  activeSubview: "usuario",
  observationFilters: {
    search: "",
    date: ""
  }
};

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const openPublicUserFormButton = document.getElementById("open-public-user-form-button");
const publicUserModal = document.getElementById("public-user-modal");
const publicUserBackdrop = document.getElementById("public-user-backdrop");
const closePublicUserButton = document.getElementById("close-public-user-button");
const publicUserForm = document.getElementById("public-user-form");
const userForm = document.getElementById("user-form");
const studentForm = document.getElementById("student-form");
const observationForm = document.getElementById("observation-form");
const navItems = Array.from(document.querySelectorAll(".nav-item"));
const ribbonItems = Array.from(document.querySelectorAll(".ribbon-item"));
const subnavItems = Array.from(document.querySelectorAll(".subnav-item"));
const viewSections = Array.from(document.querySelectorAll(".view-section"));
const subviewSections = Array.from(document.querySelectorAll(".subview-section"));
const usersList = document.getElementById("users-list");
const studentsList = document.getElementById("students-list");
const studentSelector = document.getElementById("student-selector");
const reportSelector = document.getElementById("report-selector");
const reportOutput = document.getElementById("report-output");
const dailyReportForm = document.getElementById("daily-report-form");
const dailyReportStudentSelector = document.getElementById("daily-report-student-selector");
const dailyReportOutput = document.getElementById("daily-report-output");
const observationHistoryList = document.getElementById("observation-history-list");
const observationHistoryDetail = document.getElementById("observation-history-detail");
const observationSearchInput = document.getElementById("observation-search-input");
const observationDateFilter = document.getElementById("observation-date-filter");
const latestRegistrationsList = document.getElementById("latest-registrations-list");
const latestRegistrationsDetail = document.getElementById("latest-registrations-detail");
const generateReportButton = document.getElementById("generate-report-button");
const userCount = document.getElementById("user-count");
const studentCount = document.getElementById("student-count");
const observationCount = document.getElementById("observation-count");
const reportCount = document.getElementById("report-count");
const currentUserName = document.getElementById("current-user-name");
const currentUserRole = document.getElementById("current-user-role");
const timelineChart = document.getElementById("timeline-chart");
const supportTypeList = document.getElementById("support-type-list");
const averageScoreGrid = document.getElementById("average-score-grid");
const roleDistribution = document.getElementById("role-distribution");
const latestObservations = document.getElementById("latest-observations");
const settingsButton = document.getElementById("settings-button");
const settingsModal = document.getElementById("settings-modal");
const settingsBackdrop = document.getElementById("settings-backdrop");
const closeSettingsButton = document.getElementById("close-settings-button");
const themeSelect = document.getElementById("theme-select");
const fontSizeSelect = document.getElementById("font-size-select");
const reducedMotionToggle = document.getElementById("reduced-motion-toggle");
const compactModeToggle = document.getElementById("compact-mode-toggle");
const highContrastToggle = document.getElementById("high-contrast-toggle");
const openDashboardToggle = document.getElementById("open-dashboard-toggle");
const showTopRibbonToggle = document.getElementById("show-top-ribbon-toggle");
const resetSettingsButton = document.getElementById("reset-settings-button");
const adminSettingsSection = document.getElementById("admin-settings-section");
const deleteUserSelect = document.getElementById("delete-user-select");
const deleteUserButton = document.getElementById("delete-user-button");
const deleteStudentSelect = document.getElementById("delete-student-select");
const deleteStudentButton = document.getElementById("delete-student-button");
const topRibbon = document.querySelector(".top-ribbon");
const logoutButton = document.getElementById("logout-button");
const toast = document.getElementById("toast");
const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const mobileSessionName = document.getElementById("mobile-session-name");
const mobileSettingsButton = document.getElementById("mobile-settings-button");
const mobileLogoutButton = document.getElementById("mobile-logout-button");
const reportViewerModal = document.getElementById("report-viewer-modal");
const reportViewerBackdrop = document.getElementById("report-viewer-backdrop");
const reportViewerFrame = document.getElementById("report-viewer-frame");
const reportCloseButton = document.getElementById("report-close-button");
const reportSaveButton = document.getElementById("report-save-button");
const reportShareButton = document.getElementById("report-share-button");

const SETTINGS_KEY = "edusentirSettings";
const defaultSettings = {
  theme: "light",
  fontScale: "1",
  reducedMotion: false,
  compactMode: false,
  highContrast: false,
  openDashboardOnLogin: true,
  showTopRibbon: true
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 1024px), (hover: none) and (pointer: coarse)").matches;
}

function closeMobileMenu() {
  document.body.classList.remove("mobile-menu-open");
  mobileMenuBackdrop.classList.add("hidden");
  mobileMenuButton.classList.remove("is-open");
}

function openMobileMenu() {
  if (!isMobileLayout() || !state.currentUser) {
    return;
  }

  document.body.classList.add("mobile-menu-open");
  mobileMenuBackdrop.classList.remove("hidden");
  mobileMenuButton.classList.add("is-open");
}

function syncMobileMenuVisibility() {
  const shouldShow = isMobileLayout() && Boolean(state.currentUser);
  mobileMenuButton.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) {
    closeMobileMenu();
  }
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = isError ? "rgba(137, 44, 44, 0.96)" : "rgba(35, 63, 53, 0.96)";

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function syncSettingsControls() {
  themeSelect.value = state.settings.theme;
  fontSizeSelect.value = state.settings.fontScale;
  reducedMotionToggle.checked = state.settings.reducedMotion;
  compactModeToggle.checked = state.settings.compactMode;
  highContrastToggle.checked = state.settings.highContrast;
  openDashboardToggle.checked = state.settings.openDashboardOnLogin;
  showTopRibbonToggle.checked = state.settings.showTopRibbon;
}

function applySettings() {
  document.body.classList.toggle("theme-dark", state.settings.theme === "dark");
  document.body.classList.toggle("reduced-motion", state.settings.reducedMotion);
  document.body.classList.toggle("compact-mode", state.settings.compactMode);
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  document.documentElement.style.setProperty("--font-scale", state.settings.fontScale);
  topRibbon.classList.toggle("hidden", !state.settings.showTopRibbon);
  syncSettingsControls();
  syncMobileMenuVisibility();
}

function updateDeleteUserOptions() {
  const availableUsers = state.users.filter((user) => user.id !== state.currentUser?.id);
  deleteUserSelect.innerHTML =
    `<option value="">Selecione um usuario</option>` +
    availableUsers
      .map(
        (user) =>
          `<option value="${escapeAttribute(user.id)}">${escapeHtml(user.fullName)} (${escapeHtml(user.username)})</option>`
      )
      .join("");
}

function updateDeleteStudentOptions() {
  deleteStudentSelect.innerHTML =
    `<option value="">Selecione um aluno</option>` +
    state.students
      .map((student) => `<option value="${escapeAttribute(student.id)}">${escapeHtml(student.fullName)}</option>`)
      .join("");
}

function openSettings() {
  adminSettingsSection.classList.toggle("hidden", state.currentUser?.role !== "admin");
  if (state.currentUser?.role === "admin") {
    updateDeleteUserOptions();
    updateDeleteStudentOptions();
  }
  settingsModal.classList.remove("hidden");
}

function closeSettings() {
  settingsModal.classList.add("hidden");
}

function openPublicUserModal() {
  publicUserModal.classList.remove("hidden");
}

function closePublicUserModal() {
  publicUserModal.classList.add("hidden");
}

function openReportViewer(html) {
  reportViewerFrame.removeAttribute("src");
  reportViewerFrame.srcdoc = html;
  reportViewerModal.classList.remove("hidden");
}

function closeReportViewer() {
  reportViewerModal.classList.add("hidden");
  reportViewerFrame.removeAttribute("src");
  reportViewerFrame.srcdoc = "";
}

function getCapacitorPlugin(name) {
  const capacitor = window.Capacitor;
  return capacitor?.Plugins?.[name] || null;
}

async function saveCurrentPdf() {
  if (!state.reportPdfFileName || !state.reportPdfBase64) {
    throw new Error("Nenhum PDF disponivel para salvar.");
  }

  const filesystem = getCapacitorPlugin("Filesystem");

  if (filesystem?.writeFile) {
    return filesystem.writeFile({
      path: state.reportPdfFileName,
      data: state.reportPdfBase64,
      directory: "DOCUMENTS",
      recursive: true
    });
  }

  const link = document.createElement("a");
  link.href = state.reportPdfUrl;
  link.download = state.reportPdfFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return { uri: state.reportPdfUrl };
}

async function shareCurrentPdf() {
  if (!state.reportPdfFileName || !state.reportPdfBase64) {
    throw new Error("Nenhum PDF disponivel para compartilhar.");
  }

  const share = getCapacitorPlugin("Share");
  const saved = await saveCurrentPdf();

  if (share?.share && saved?.uri) {
    await share.share({
      title: "Compartilhar relatorio",
      text: "Relatorio gerado pelo Edusentir.",
      url: saved.uri
    });
    return;
  }

  throw new Error("O compartilhamento nativo nao esta disponivel neste dispositivo.");
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  return window.appApi.formatDate(dateString);
}

function getTodayLocalDate() {
  return window.appApi.getTodayLocalDate();
}

function setActiveView(view) {
  state.activeView = view;

  navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  ribbonItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  viewSections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== `view-${view}`);
  });

  if (isMobileLayout()) {
    closeMobileMenu();
  }
}

function renderDashboard() {
  if (!state.dashboard) {
    timelineChart.innerHTML = `<div class="empty-state">Sem dados para o dashboard.</div>`;
    supportTypeList.innerHTML = `<div class="empty-state">Sem tipos de suporte cadastrados.</div>`;
    averageScoreGrid.innerHTML = "";
    roleDistribution.innerHTML = `<div class="empty-state">Sem usuarios cadastrados.</div>`;
    latestObservations.innerHTML = `<div class="empty-state">Sem observacoes recentes.</div>`;
    return;
  }

  const { totals, supportTypes, userRoles, averages, latestObservations: recentItems, timeline } = state.dashboard;
  userCount.textContent = String(totals.userCount);
  studentCount.textContent = String(totals.studentCount);
  observationCount.textContent = String(totals.observationCount);
  reportCount.textContent = String(totals.reportCount);

  const maxTimeline = Math.max(...timeline.map((item) => item.total), 1);
  timelineChart.innerHTML = timeline
    .map(
      (item) => `
        <div class="bar-column">
          <span class="bar-value">${item.total}</span>
          <div class="bar-track">
            <div class="bar-fill" style="height: ${Math.max((item.total / maxTimeline) * 100, item.total ? 16 : 6)}%"></div>
          </div>
          <span class="bar-label">${item.label}</span>
        </div>
      `
    )
    .join("");

  const maxSupport = Math.max(...supportTypes.map((item) => item.total), 1);
  supportTypeList.innerHTML =
    supportTypes.length === 0
      ? `<div class="empty-state">Sem tipos de suporte cadastrados.</div>`
      : supportTypes
          .map(
            (item) => `
              <article class="metric-item">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.total)}</strong>
                <div class="metric-progress">
                  <span style="width: ${(item.total / maxSupport) * 100}%"></span>
                </div>
              </article>
            `
          )
          .join("");

  averageScoreGrid.innerHTML = [
    { label: "Comunicacao", value: averages.communication },
    { label: "Autonomia", value: averages.autonomy },
    { label: "Interacao social", value: averages.social },
    { label: "Desenvolvimento motor", value: averages.motor }
  ]
    .map(
      (item) => `
        <article class="score-box">
          <p>${item.label}</p>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");

  const maxRoles = Math.max(...userRoles.map((item) => item.total), 1);
  roleDistribution.innerHTML =
    userRoles.length === 0
      ? `<div class="empty-state">Sem usuarios cadastrados.</div>`
      : userRoles
          .map(
            (item) => `
              <article class="metric-item">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.total)}</strong>
                <div class="metric-progress">
                  <span style="width: ${(item.total / maxRoles) * 100}%"></span>
                </div>
              </article>
            `
          )
          .join("");

  latestObservations.innerHTML =
    recentItems.length === 0
      ? `<div class="empty-state">Sem observacoes recentes.</div>`
      : recentItems
          .map(
            (item) => `
              <article class="activity-item">
                <p><strong>${escapeHtml(item.studentName)}</strong> - ${formatDate(item.date)}</p>
                <p><strong>Autor:</strong> ${escapeHtml(item.author || "Nao informado")}</p>
                <p><strong>Contexto:</strong> ${escapeHtml(item.context || "Nao informado")}</p>
                <p>${escapeHtml(item.behaviorNotes)}</p>
              </article>
            `
          )
          .join("");
}

function setActiveSubview(subview) {
  state.activeSubview = subview;

  subnavItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.subview === subview);
  });

  subviewSections.forEach((section) => {
    section.classList.toggle("hidden", section.id !== `subview-${subview}`);
  });
}

function renderEmotionTags(emotions) {
  const items = Array.isArray(emotions) ? emotions : [];
  if (items.length === 0) {
    return `<span class="emotion-empty">Nao informado</span>`;
  }

  return items.map((emotion) => `<span class="emotion-tag">${escapeHtml(emotion)}</span>`).join("");
}

function renderUsers() {
  userCount.textContent = String(state.users.length);
  updateDeleteUserOptions();
  renderLatestRegistrations();

  if (state.users.length === 0) {
    usersList.innerHTML = `<div class="empty-state">Nenhum usuario cadastrado ainda.</div>`;
    return;
  }

  usersList.innerHTML = state.users
    .map(
      (user) => `
        <article class="user-card">
          <h4>${escapeHtml(user.fullName)}</h4>
          <p><strong>Usuario:</strong> ${escapeHtml(user.username)}</p>
          <p><strong>Perfil:</strong> ${escapeHtml(user.role)}</p>
          <p><strong>E-mail:</strong> ${escapeHtml(user.email || "Nao informado")}</p>
          <p><strong>Telefone:</strong> ${escapeHtml(user.phone || "Nao informado")}</p>
        </article>
      `
    )
    .join("");
}

function renderStudents() {
  studentCount.textContent = String(state.students.length);
  observationCount.textContent = String(
    state.students.reduce((total, student) => total + student.observations.length, 0)
  );

  const options = state.students
    .map((student) => `<option value="${escapeAttribute(student.id)}">${escapeHtml(student.fullName)}</option>`)
    .join("");

  studentSelector.innerHTML = `<option value="">Selecione</option>${options}`;
  reportSelector.innerHTML = `<option value="">Selecione um cadastro</option>${options}`;
  dailyReportStudentSelector.innerHTML = `<option value="">Selecione um aluno</option>${options}`;
  updateDeleteStudentOptions();

  if (state.students.length === 0) {
    studentsList.innerHTML = `<div class="empty-state">Nenhum aluno cadastrado ainda.</div>`;
    return;
  }

  studentsList.innerHTML = state.students
    .map(
      (student) => `
        <article class="student-card">
          <h4>${escapeHtml(student.fullName)}</h4>
          <p><strong>Suporte:</strong> ${escapeHtml(student.supportType)}</p>
          <p><strong>Responsavel:</strong> ${escapeHtml(student.guardianName)}</p>
          <p><strong>Observacoes:</strong> ${escapeHtml(student.observations.length)}</p>
          <p><strong>Metas:</strong> ${escapeHtml(student.goals || "Ainda nao definidas")}</p>
        </article>
      `
    )
    .join("");

  renderObservationHistory();
  renderLatestRegistrations();
}

function getAllObservations() {
  return state.students
    .flatMap((student) =>
      student.observations.map((observation) => ({
        ...observation,
        studentName: student.fullName,
        supportType: student.supportType,
        guardianName: student.guardianName
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getFilteredObservations() {
  const searchTerm = state.observationFilters.search.trim().toLowerCase();
  const dateFilter = state.observationFilters.date;

  return getAllObservations().filter((observation) => {
    const matchesSearch =
      !searchTerm ||
      observation.studentName.toLowerCase().includes(searchTerm) ||
      String(observation.author || "").toLowerCase().includes(searchTerm);

    const matchesDate = !dateFilter || String(observation.date).slice(0, 10) === dateFilter;
    return matchesSearch && matchesDate;
  });
}

function getLatestRegistrations() {
  const userItems = state.users.map((user) => ({
    key: `user-${user.id}`,
    type: "Usuario",
    title: user.fullName,
    subtitle: user.username,
    createdAt: user.createdAt,
    detailHtml: `
      <p class="eyebrow">Usuario cadastrado</p>
      <h3>${escapeHtml(user.fullName)}</h3>
      <p><strong>Usuario:</strong> ${escapeHtml(user.username)}</p>
      <p><strong>Perfil:</strong> ${escapeHtml(user.role)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(user.email || "Nao informado")}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(user.phone || "Nao informado")}</p>
      <p><strong>Criado em:</strong> ${formatDate(user.createdAt)}</p>
    `
  }));

  const studentItems = state.students.map((student) => ({
    key: `student-${student.id}`,
    type: "Aluno",
    title: student.fullName,
    subtitle: student.supportType,
    createdAt: student.createdAt,
    detailHtml: `
      <p class="eyebrow">Aluno cadastrado</p>
      <h3>${escapeHtml(student.fullName)}</h3>
      <p><strong>Idade:</strong> ${escapeHtml(student.age || "Nao informada")}</p>
      <p><strong>Tipo de suporte:</strong> ${escapeHtml(student.supportType)}</p>
      <p><strong>Diagnostico:</strong> ${escapeHtml(student.diagnosis || "Nao informado")}</p>
      <p><strong>Responsavel:</strong> ${escapeHtml(student.guardianName)}</p>
      <p><strong>Metas:</strong> ${escapeHtml(student.goals || "Nao informadas")}</p>
      <p><strong>Criado em:</strong> ${formatDate(student.createdAt)}</p>
    `
  }));

  return [...userItems, ...studentItems]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
}

function renderLatestRegistrations() {
  const registrations = getLatestRegistrations();

  if (registrations.length === 0) {
    latestRegistrationsList.innerHTML = `<div class="empty-state">Nenhum cadastro recente encontrado.</div>`;
    latestRegistrationsDetail.className = "report-section history-detail empty-state";
    latestRegistrationsDetail.textContent = "Selecione um cadastro recente para visualizar os detalhes.";
    return;
  }

  if (!registrations.some((item) => item.key === state.selectedRegistrationKey)) {
    state.selectedRegistrationKey = registrations[0].key;
  }

  latestRegistrationsList.innerHTML = registrations
    .map(
      (item) => `
        <button
          type="button"
          class="history-item ${item.key === state.selectedRegistrationKey ? "active" : ""}"
          data-registration-key="${escapeAttribute(item.key)}"
        >
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.type)} - ${escapeHtml(item.subtitle)}</p>
          <p>${formatDate(item.createdAt)}</p>
        </button>
      `
    )
    .join("");

  latestRegistrationsList.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRegistrationKey = button.dataset.registrationKey;
      renderLatestRegistrations();
    });
  });

  const selected = registrations.find((item) => item.key === state.selectedRegistrationKey) || registrations[0];
  latestRegistrationsDetail.className = "report-section history-detail";
  latestRegistrationsDetail.innerHTML = selected.detailHtml;
}

function renderObservationHistoryDetail() {
  const observations = getFilteredObservations();
  const selectedObservation =
    observations.find((observation) => observation.id === state.selectedObservationId) || observations[0];

  if (!selectedObservation) {
    observationHistoryDetail.className = "report-section history-detail empty-state";
    observationHistoryDetail.textContent = "Selecione um acompanhamento para visualizar os detalhes.";
    return;
  }

  state.selectedObservationId = selectedObservation.id;
  observationHistoryDetail.className = "report-section history-detail";
  observationHistoryDetail.innerHTML = `
    <p class="eyebrow">Detalhes do registro</p>
    <h3>${escapeHtml(selectedObservation.studentName)}</h3>
    <p><strong>Data:</strong> ${formatDate(selectedObservation.date)}</p>
    <p><strong>Autor:</strong> ${escapeHtml(selectedObservation.author || "Nao informado")}</p>
    <p><strong>Contexto:</strong> ${escapeHtml(selectedObservation.context || "Nao informado")}</p>
    <p><strong>Suporte:</strong> ${escapeHtml(selectedObservation.supportType)}</p>
    <p><strong>Responsavel:</strong> ${escapeHtml(selectedObservation.guardianName)}</p>
    <p><strong>Comportamentos observados:</strong> ${escapeHtml(selectedObservation.behaviorNotes)}</p>
    <p><strong>Avancos percebidos:</strong> ${escapeHtml(selectedObservation.progressNotes || "Nao informado")}</p>
    <p><strong>Comunicacao:</strong> ${escapeHtml(selectedObservation.communicationScore)}</p>
    <p><strong>Autonomia:</strong> ${escapeHtml(selectedObservation.autonomyScore)}</p>
    <p><strong>Interacao social:</strong> ${escapeHtml(selectedObservation.socialScore)}</p>
    <p><strong>Desenvolvimento motor:</strong> ${escapeHtml(selectedObservation.motorScore)}</p>
  `;
}

function renderObservationHistory() {
  const observations = getFilteredObservations();

  if (observations.length === 0) {
    observationHistoryList.innerHTML = `<div class="empty-state">Nenhum acompanhamento encontrado para os filtros informados.</div>`;
    observationHistoryDetail.className = "report-section history-detail empty-state";
    observationHistoryDetail.textContent = "Selecione um acompanhamento para visualizar os detalhes.";
    return;
  }

  if (!observations.some((observation) => observation.id === state.selectedObservationId)) {
    state.selectedObservationId = observations[0].id;
  }

  observationHistoryList.innerHTML = observations
    .map(
      (observation) => `
        <button
          type="button"
          class="history-item ${observation.id === state.selectedObservationId ? "active" : ""}"
          data-observation-id="${escapeAttribute(observation.id)}"
        >
          <strong>${escapeHtml(observation.studentName)}</strong>
          <p>${formatDate(observation.date)} - ${escapeHtml(observation.author || "Nao informado")}</p>
          <p>${escapeHtml(observation.context || "Sem contexto informado")}</p>
        </button>
      `
    )
    .join("");

  observationHistoryList.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedObservationId = button.dataset.observationId;
      renderObservationHistory();
    });
  });

  renderObservationHistoryDetail();
}

function createList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderReport(report) {
  if (!report) {
    reportOutput.className = "report-output empty-state";
    reportOutput.textContent = "Escolha um cadastro para gerar um panorama do desenvolvimento.";
    return;
  }

  reportOutput.className = "report-output";
  reportOutput.innerHTML = `
    <section class="report-section">
      <p class="eyebrow">Perfil</p>
      <h3>${escapeHtml(report.student.fullName)}</h3>
      <p>
        ${escapeHtml(report.student.supportType)} | Responsavel principal: ${escapeHtml(report.student.guardianName)} |
        Metas atuais: ${escapeHtml(report.student.goals || "Nao informadas")}
      </p>
    </section>

    <section class="report-summary">
      <article class="summary-card">
        Comunicacao
        <strong>${report.summary.communicationAverage}</strong>
      </article>
      <article class="summary-card">
        Autonomia
        <strong>${report.summary.autonomyAverage}</strong>
      </article>
      <article class="summary-card">
        Interacao social
        <strong>${report.summary.socialAverage}</strong>
      </article>
      <article class="summary-card">
        Motor
        <strong>${report.summary.motorAverage}</strong>
      </article>
    </section>

    <section class="report-section">
      <h4>Leitura atual do desenvolvimento</h4>
      <p>${escapeHtml(report.summary.progressMessage)}</p>
      <p>Total de registros considerados: ${escapeHtml(report.summary.totalObservations)}</p>
    </section>

    <section class="report-section">
      <h4>Emocional do aluno</h4>
      <p>${escapeHtml(report.summary.emotionalMessage)}</p>
      <div class="emotion-tag-list">
        ${renderEmotionTags(report.summary.frequentEmotions)}
      </div>
    </section>

    <section class="report-section">
      <h4>Pontos fortes</h4>
      ${createList(report.strengths)}
    </section>

    <section class="report-section">
      <h4>Pontos de atencao</h4>
      ${createList(report.attentionPoints)}
    </section>

    <section class="report-section">
      <h4>Ultimos registros</h4>
      ${
        report.latestObservations.length === 0
          ? "<p>Ainda nao existem observacoes para este cadastro.</p>"
          : report.latestObservations
              .map(
                (observation) => `
                  <article class="observation-item">
                    <p><strong>${formatDate(observation.date)}</strong> - ${escapeHtml(observation.author || "Nao informado")}</p>
                    <p><strong>Contexto:</strong> ${escapeHtml(observation.context || "Nao informado")}</p>
                    <p><strong>Comportamentos:</strong> ${escapeHtml(observation.behaviorNotes)}</p>
                    <p><strong>Avancos:</strong> ${escapeHtml(observation.progressNotes || "Nao informado")}</p>
                    <p><strong>Emocional:</strong></p>
                    <div class="emotion-tag-list">
                      ${renderEmotionTags(observation.emotions)}
                    </div>
                  </article>
                `
              )
              .join("")
      }
    </section>
  `;
}

function renderDailyReport(report) {
  if (!report) {
    dailyReportOutput.className = "report-output empty-state";
    dailyReportOutput.textContent = "Selecione um aluno, escreva a observacao e gere o bilhete diario.";
    return;
  }

  dailyReportOutput.className = "report-output";
  dailyReportOutput.innerHTML = `
    <section class="report-section">
      <p class="eyebrow">Bilhete diario</p>
      <h3>${escapeHtml(report.student.fullName)}</h3>
      <p>${escapeHtml(report.student.supportType)} | Responsavel: ${escapeHtml(report.student.guardianName)}</p>
      <p><strong>Data:</strong> ${formatDate(report.date)}</p>
    </section>

    <section class="report-section">
      <h4>Resumo para a familia</h4>
      <p>${escapeHtml(report.message)}</p>
    </section>

    <section class="report-section">
      <h4>Observacao registrada</h4>
      <p>${escapeHtml(report.dailyNotes)}</p>
    </section>
  `;
}

async function loadUsers() {
  state.users = await window.appApi.listUsers();
  renderUsers();
}

async function loadDashboard() {
  state.dashboard = await window.appApi.getDashboardData();
  renderDashboard();
}

async function loadStudents() {
  state.students = await window.appApi.listStudents();
  renderStudents();
}

async function loadDashboardData() {
  await Promise.all([loadDashboard(), loadUsers(), loadStudents()]);
}

function openApp(user) {
  state.currentUser = user;
  currentUserName.textContent = user.username;
  currentUserRole.textContent = "";
  currentUserRole.classList.add("hidden");
  mobileSessionName.textContent = user.username;
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  syncMobileMenuVisibility();
  setActiveView(state.settings.openDashboardOnLogin ? "dashboard" : "cadastro");
  setActiveSubview("usuario");
}

function logout() {
  window.appApi.logout();
  state.currentUser = null;
  state.dashboard = null;
  state.users = [];
  state.students = [];
  state.report = null;
  state.reportHtml = null;
  state.reportPdfUrl = null;
  state.reportPdfFileName = null;
  state.reportPdfBase64 = null;
  state.selectedObservationId = null;
  state.selectedRegistrationKey = null;
  currentUserName.textContent = "admin";
  mobileSessionName.textContent = "admin";
  loginForm.reset();
  userForm.reset();
  studentForm.reset();
  observationForm.reset();
  loginScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
  syncMobileMenuVisibility();
  closeSettings();
  renderDashboard();
  renderReport(null);
  showToast("Sessao encerrada com sucesso.");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const user = await window.appApi.login(payload);
    openApp(user);
    await loadDashboardData();
    observationForm.date.value = getTodayLocalDate();
    renderReport(null);
    showToast(`Bem-vindo, ${user.fullName}.`);
  } catch (error) {
    showToast(error.message, true);
  }
});

publicUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(publicUserForm).entries());

  try {
    await window.appApi.registerUser(payload);
    publicUserForm.reset();
    closePublicUserModal();
    showToast("Usuario cadastrado com sucesso. Agora voce pode entrar.");
  } catch (error) {
    showToast(error.message, true);
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(userForm).entries());

  try {
    await window.appApi.createUser(payload);
    userForm.reset();
    await Promise.all([loadUsers(), loadDashboard()]);
    showToast("Usuario cadastrado com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(studentForm).entries());

  try {
    await window.appApi.createStudent(payload);
    studentForm.reset();
    await Promise.all([loadStudents(), loadDashboard()]);
    setActiveView("relatorios");
    showToast("Aluno cadastrado com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

observationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(observationForm).entries());

  try {
    payload.emotions = Array.from(observationForm.querySelectorAll('input[name="emotions"]:checked')).map(
      (input) => input.value
    );
    await window.appApi.addObservation(payload);
    observationForm.reset();
    observationForm.date.value = getTodayLocalDate();
    await Promise.all([loadStudents(), loadDashboard()]);
    setActiveView("historico");
    showToast("Observacao registrada com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

generateReportButton.addEventListener("click", async () => {
  const studentId = reportSelector.value;

  if (!studentId) {
    showToast("Selecione um cadastro para gerar o relatorio.", true);
    return;
  }

  try {
    const result = await window.appApi.generateReportPdf(studentId);
    state.report = result.report;
    state.reportHtml = result.html;
    state.reportPdfUrl = result.pdfUrl;
    state.reportPdfFileName = result.fileName;
    state.reportPdfBase64 = result.pdfBase64;
    renderReport(state.report);
    await loadDashboard();
    if (result.html) {
      openReportViewer(result.html);
      showToast("Relatorio aberto dentro do aplicativo.");
    } else {
      showToast("Relatorio gerado com sucesso.");
    }
  } catch (error) {
    showToast(error.message, true);
  }
});

dailyReportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(dailyReportForm).entries());

  try {
    const result = await window.appApi.generateDailyReportPdf(payload);
    state.report = result.report;
    state.reportHtml = result.html;
    state.reportPdfUrl = result.pdfUrl;
    state.reportPdfFileName = result.fileName;
    state.reportPdfBase64 = result.pdfBase64;
    renderDailyReport(result.report);
    if (result.html) {
      openReportViewer(result.html);
      showToast("Bilhete diario gerado com sucesso.");
    } else {
      showToast("Relatorio diario gerado com sucesso.");
    }
  } catch (error) {
    showToast(error.message, true);
  }
});

navItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

ribbonItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.view);
  });
});

subnavItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSubview(button.dataset.subview);
  });
});

settingsButton.addEventListener("click", () => {
  openSettings();
});

openPublicUserFormButton.addEventListener("click", () => {
  openPublicUserModal();
});

closePublicUserButton.addEventListener("click", () => {
  closePublicUserModal();
});

publicUserBackdrop.addEventListener("click", () => {
  closePublicUserModal();
});

mobileSettingsButton.addEventListener("click", () => {
  closeMobileMenu();
  openSettings();
});

mobileLogoutButton.addEventListener("click", () => {
  closeMobileMenu();
  logout();
});

mobileMenuButton.addEventListener("click", () => {
  if (document.body.classList.contains("mobile-menu-open")) {
    closeMobileMenu();
    return;
  }

  openMobileMenu();
});

mobileMenuBackdrop.addEventListener("click", () => {
  closeMobileMenu();
});

observationSearchInput.addEventListener("input", () => {
  state.observationFilters.search = observationSearchInput.value;
  state.selectedObservationId = null;
  renderObservationHistory();
});

observationDateFilter.addEventListener("change", () => {
  state.observationFilters.date = observationDateFilter.value;
  state.selectedObservationId = null;
  renderObservationHistory();
});

closeSettingsButton.addEventListener("click", () => {
  closeSettings();
});

settingsBackdrop.addEventListener("click", () => {
  closeSettings();
});

reportCloseButton.addEventListener("click", () => {
  closeReportViewer();
});

reportViewerBackdrop.addEventListener("click", () => {
  closeReportViewer();
});

reportSaveButton.addEventListener("click", () => {
  saveCurrentPdf()
    .then(() => {
      showToast("PDF salvo ou download iniciado.");
    })
    .catch((error) => {
      showToast(error.message, true);
    });
});

reportShareButton.addEventListener("click", () => {
  shareCurrentPdf()
    .then(() => {
      showToast("PDF pronto para compartilhamento.");
    })
    .catch((error) => {
      showToast(error.message, true);
    });
});

themeSelect.addEventListener("change", () => {
  state.settings.theme = themeSelect.value;
  saveSettings();
  applySettings();
});

fontSizeSelect.addEventListener("change", () => {
  state.settings.fontScale = fontSizeSelect.value;
  saveSettings();
  applySettings();
});

reducedMotionToggle.addEventListener("change", () => {
  state.settings.reducedMotion = reducedMotionToggle.checked;
  saveSettings();
  applySettings();
});

compactModeToggle.addEventListener("change", () => {
  state.settings.compactMode = compactModeToggle.checked;
  saveSettings();
  applySettings();
});

highContrastToggle.addEventListener("change", () => {
  state.settings.highContrast = highContrastToggle.checked;
  saveSettings();
  applySettings();
});

openDashboardToggle.addEventListener("change", () => {
  state.settings.openDashboardOnLogin = openDashboardToggle.checked;
  saveSettings();
});

showTopRibbonToggle.addEventListener("change", () => {
  state.settings.showTopRibbon = showTopRibbonToggle.checked;
  saveSettings();
  applySettings();
});

resetSettingsButton.addEventListener("click", () => {
  state.settings = { ...defaultSettings };
  saveSettings();
  applySettings();
  showToast("Configuracoes restauradas.");
});

deleteUserButton.addEventListener("click", async () => {
  if (state.currentUser?.role !== "admin") {
    showToast("Apenas administradores podem excluir usuarios.", true);
    return;
  }

  if (!deleteUserSelect.value) {
    showToast("Selecione um usuario para excluir.", true);
    return;
  }

  try {
    await window.appApi.deleteUser({
      requesterUserId: state.currentUser.id,
      requesterRole: state.currentUser.role,
      targetUserId: deleteUserSelect.value
    });
    await Promise.all([loadUsers(), loadDashboard()]);
    deleteUserSelect.value = "";
    showToast("Usuario excluido com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

deleteStudentButton.addEventListener("click", async () => {
  if (state.currentUser?.role !== "admin") {
    showToast("Apenas administradores podem excluir alunos.", true);
    return;
  }

  if (!deleteStudentSelect.value) {
    showToast("Selecione um aluno para excluir.", true);
    return;
  }

  try {
    await window.appApi.deleteStudent({
      requesterRole: state.currentUser.role,
      targetStudentId: deleteStudentSelect.value
    });
    await Promise.all([loadStudents(), loadDashboard()]);
    deleteStudentSelect.value = "";
    renderReport(null);
    showToast("Aluno excluido com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

logoutButton.addEventListener("click", () => {
  logout();
});

window.addEventListener("DOMContentLoaded", () => {
  state.settings = readSettings();
  applySettings();
  observationForm.date.value = getTodayLocalDate();
  renderDashboard();
  renderLatestRegistrations();
  renderObservationHistory();
  renderReport(null);
  renderDailyReport(null);
  syncMobileMenuVisibility();

  window.appApi
    .getSessionUser()
    .then((sessionUser) => {
      if (!sessionUser) {
        return;
      }

      openApp(sessionUser);
      return loadDashboardData();
    })
    .catch((error) => {
      showToast(error.message, true);
    });
});

window.addEventListener("resize", () => {
  syncMobileMenuVisibility();
});
