function getAverageScore(observations, field) {
  if (observations.length === 0) {
    return 0;
  }

  const total = observations.reduce((sum, observation) => sum + Number(observation[field] || 0), 0);
  return Number((total / observations.length).toFixed(1));
}

function getAreasForAttention(observations) {
  if (observations.length === 0) {
    return ["Ainda nao existem registros suficientes para destacar pontos de atencao."];
  }

  const areas = [
    { key: "communicationScore", label: "comunicacao" },
    { key: "autonomyScore", label: "autonomia" },
    { key: "socialScore", label: "interacao social" },
    { key: "motorScore", label: "desenvolvimento motor" }
  ];

  return areas
    .filter((area) => getAverageScore(observations, area.key) < 3)
    .map((area) => `Reforcar estrategias de apoio em ${area.label}.`);
}

function getStrongPoints(observations) {
  if (observations.length === 0) {
    return ["Os pontos fortes aparecerao conforme novas observacoes forem registradas."];
  }

  const areas = [
    { key: "communicationScore", label: "comunicacao" },
    { key: "autonomyScore", label: "autonomia" },
    { key: "socialScore", label: "interacao social" },
    { key: "motorScore", label: "desenvolvimento motor" }
  ];

  const strengths = areas
    .filter((area) => getAverageScore(observations, area.key) >= 4)
    .map((area) => `Bom desempenho observado em ${area.label}.`);

  return strengths.length > 0 ? strengths : ["O desenvolvimento segue em consolidacao e precisa de acompanhamento continuo."];
}

function getProgressMessage(observations) {
  if (observations.length === 0) {
    return "Sem registros suficientes para avaliar a evolucao.";
  }

  if (observations.length === 1) {
    return "Existe apenas um registro no momento. O ideal e manter observacoes frequentes para perceber tendencias.";
  }

  const latest = observations[0];
  const oldest = observations[observations.length - 1];

  const latestAverage =
    (latest.communicationScore + latest.autonomyScore + latest.socialScore + latest.motorScore) / 4;
  const oldestAverage =
    (oldest.communicationScore + oldest.autonomyScore + oldest.socialScore + oldest.motorScore) / 4;

  const delta = Number((latestAverage - oldestAverage).toFixed(1));

  if (delta >= 0.5) {
    return "Os registros indicam progresso consistente nas ultimas observacoes.";
  }

  if (delta <= -0.5) {
    return "Os registros mostram sinais de regressao recente e pedem intervencoes mais proximas.";
  }

  return "O desenvolvimento se manteve estavel entre os registros mais recentes.";
}

function buildReport(student) {
  const observations = [...student.observations].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    student,
    summary: {
      totalObservations: observations.length,
      communicationAverage: getAverageScore(observations, "communicationScore"),
      autonomyAverage: getAverageScore(observations, "autonomyScore"),
      socialAverage: getAverageScore(observations, "socialScore"),
      motorAverage: getAverageScore(observations, "motorScore"),
      progressMessage: getProgressMessage(observations)
    },
    strengths: getStrongPoints(observations),
    attentionPoints: getAreasForAttention(observations),
    latestObservations: observations.slice(0, 5)
  };
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildReportHtml(report) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatorio - ${escapeHtml(report.student.fullName)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #1f2933;
            margin: 32px;
          }
          h1, h2, h3, h4 {
            margin: 0 0 10px;
          }
          .header {
            border-bottom: 2px solid #bf5b39;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .section {
            margin-bottom: 22px;
            padding: 18px;
            border: 1px solid #d9e2ec;
            border-radius: 12px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          .summary-card {
            padding: 14px;
            border-radius: 10px;
            background: #f7f3ee;
            border: 1px solid #ead8c9;
          }
          .summary-card strong {
            display: block;
            margin-top: 6px;
            font-size: 24px;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          .observation {
            border-top: 1px solid #e6e6e6;
            padding-top: 12px;
            margin-top: 12px;
          }
          .observation:first-child {
            border-top: none;
            margin-top: 0;
            padding-top: 0;
          }
          .muted {
            color: #52606d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatorio de desenvolvimento</h1>
          <p class="muted">
            Aluno: ${escapeHtml(report.student.fullName)} | Responsavel: ${escapeHtml(report.student.guardianName)}
          </p>
          <p class="muted">
            Tipo de suporte: ${escapeHtml(report.student.supportType)} | Gerado em: ${formatDate(new Date().toISOString())}
          </p>
        </div>

        <section class="section">
          <h2>Resumo geral</h2>
          <div class="summary">
            <div class="summary-card">Comunicacao<strong>${escapeHtml(report.summary.communicationAverage)}</strong></div>
            <div class="summary-card">Autonomia<strong>${escapeHtml(report.summary.autonomyAverage)}</strong></div>
            <div class="summary-card">Interacao social<strong>${escapeHtml(report.summary.socialAverage)}</strong></div>
            <div class="summary-card">Motor<strong>${escapeHtml(report.summary.motorAverage)}</strong></div>
          </div>
          <p class="muted" style="margin-top: 14px;">${escapeHtml(report.summary.progressMessage)}</p>
          <p class="muted">Total de registros considerados: ${escapeHtml(report.summary.totalObservations)}</p>
        </section>

        <section class="section">
          <h3>Pontos fortes</h3>
          <ul>${buildList(report.strengths)}</ul>
        </section>

        <section class="section">
          <h3>Pontos de atencao</h3>
          <ul>${buildList(report.attentionPoints)}</ul>
        </section>

        <section class="section">
          <h3>Ultimas observacoes</h3>
          ${
            report.latestObservations.length === 0
              ? "<p class='muted'>Nao ha observacoes registradas.</p>"
              : report.latestObservations
                  .map(
                    (observation) => `
                      <div class="observation">
                        <h4>${escapeHtml(formatDate(observation.date))} - ${escapeHtml(observation.author || "Nao informado")}</h4>
                        <p><strong>Contexto:</strong> ${escapeHtml(observation.context || "Nao informado")}</p>
                        <p><strong>Comportamentos:</strong> ${escapeHtml(observation.behaviorNotes)}</p>
                        <p><strong>Avancos:</strong> ${escapeHtml(observation.progressNotes || "Nao informado")}</p>
                      </div>
                    `
                  )
                  .join("")
          }
        </section>
      </body>
    </html>
  `;
}

module.exports = {
  buildReport,
  buildReportHtml
};
