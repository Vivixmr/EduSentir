const state = {
  students: [],
  report: null
};

const studentForm = document.getElementById("student-form");
const observationForm = document.getElementById("observation-form");
const studentsList = document.getElementById("students-list");
const studentSelector = document.getElementById("student-selector");
const reportSelector = document.getElementById("report-selector");
const reportOutput = document.getElementById("report-output");
const generateReportButton = document.getElementById("generate-report-button");
const studentCount = document.getElementById("student-count");
const observationCount = document.getElementById("observation-count");
const toast = document.getElementById("toast");

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = isError ? "rgba(137, 44, 44, 0.96)" : "rgba(35, 63, 53, 0.96)";

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function formatDate(dateString) {
  if (!dateString) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(dateString));
}

function renderStudents() {
  studentCount.textContent = String(state.students.length);
  observationCount.textContent = String(
    state.students.reduce((total, student) => total + student.observations.length, 0)
  );

  const options = state.students
    .map((student) => `<option value="${student.id}">${student.fullName}</option>`)
    .join("");

  studentSelector.innerHTML = `<option value="">Selecione</option>${options}`;
  reportSelector.innerHTML = `<option value="">Selecione um cadastro</option>${options}`;

  if (state.students.length === 0) {
    studentsList.innerHTML = `
      <div class="empty-state">
        Nenhum cadastro criado ainda. Comece preenchendo o formulario ao lado.
      </div>
    `;
    return;
  }

  studentsList.innerHTML = state.students
    .map(
      (student) => `
        <article class="student-card">
          <h4>${student.fullName}</h4>
          <p><strong>Suporte:</strong> ${student.supportType}</p>
          <p><strong>Responsavel:</strong> ${student.guardianName}</p>
          <p><strong>Escola/contexto:</strong> ${student.schoolName || "Nao informado"}</p>
          <p><strong>Observacoes:</strong> ${student.observations.length}</p>
          <p><strong>Metas:</strong> ${student.goals || "Ainda nao definidas"}</p>
        </article>
      `
    )
    .join("");
}

function createList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
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
      <h3>${report.student.fullName}</h3>
      <p>
        ${report.student.supportType} | Responsavel principal: ${report.student.guardianName} |
        Metas atuais: ${report.student.goals || "Nao informadas"}
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
      <p>${report.summary.progressMessage}</p>
      <p>Total de registros considerados: ${report.summary.totalObservations}</p>
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
                    <p><strong>${formatDate(observation.date)}</strong> • ${observation.author}</p>
                    <p><strong>Contexto:</strong> ${observation.context || "Nao informado"}</p>
                    <p><strong>Comportamentos:</strong> ${observation.behaviorNotes}</p>
                    <p><strong>Avancos:</strong> ${observation.progressNotes || "Nao informado"}</p>
                  </article>
                `
              )
              .join("")
      }
    </section>
  `;
}

async function loadStudents() {
  state.students = await window.appApi.listStudents();
  renderStudents();
}

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(studentForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await window.appApi.createStudent(payload);
    studentForm.reset();
    await loadStudents();
    showToast("Cadastro salvo com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

observationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(observationForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await window.appApi.addObservation(payload);
    observationForm.reset();
    observationForm.date.value = new Date().toISOString().split("T")[0];
    await loadStudents();
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
    state.report = await window.appApi.generateReport(studentId);
    renderReport(state.report);
    showToast("Relatorio atualizado.");
  } catch (error) {
    showToast(error.message, true);
  }
});

window.addEventListener("DOMContentLoaded", async () => {
  observationForm.date.value = new Date().toISOString().split("T")[0];
  await loadStudents();
  renderReport(null);
});
