(() => {
  const STORAGE_KEY = "edusentirMobileDb";
  const SESSION_KEY = "edusentirSession";
  const ROLES = ["parent", "teacher", "guardian", "admin", "medical"];
  const ALLOWED_EMOTIONS = ["Ansioso", "Assustado", "Amoroso", "Brincalhao", "Calmo", "Irritado", "Triste"];
  const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
  const PASSWORD_HASH_ITERATIONS = 210000;

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseLocalDateParts(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }

    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
  }

  function formatDate(value) {
    const parts = parseLocalDateParts(value);
    if (!parts) {
      return "-";
    }

    return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
  }

  function getTodayLocalDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function createPdfFileName(studentName) {
    const safeName = String(studentName || "aluno")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const timestamp = nowIso().replace(/[:.]/g, "-");
    return `relatorio-${safeName || "aluno"}-${timestamp}.pdf`;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = window.atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  async function legacySha256(password) {
    const encoder = new TextEncoder();
    const digest = await window.crypto.subtle.digest("SHA-256", encoder.encode(password));
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  async function derivePasswordHash(password, salt, iterations = PASSWORD_HASH_ITERATIONS) {
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations
      },
      key,
      256
    );
    return new Uint8Array(bits);
  }

  async function hashPassword(password) {
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    const digest = await derivePasswordHash(password, salt);
    return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(digest)}`;
  }

  async function verifyPassword(password, passwordHash) {
    if (String(passwordHash || "").startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      try {
        const [, iterationsRaw, saltRaw, digestRaw] = String(passwordHash).split("$");
        const iterations = Number(iterationsRaw);
        if (!Number.isInteger(iterations) || !saltRaw || !digestRaw) {
          return false;
        }

        const salt = base64ToBytes(saltRaw);
        const digest = await derivePasswordHash(password, salt, iterations);
        return bytesToBase64(digest) === digestRaw;
      } catch {
        return false;
      }
    }

    return (await legacySha256(password)) === passwordHash;
  }

  async function upgradePasswordHashIfNeeded(db, user, password) {
    if (String(user.passwordHash || "").startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      return;
    }

    user.passwordHash = await hashPassword(password);
    user.updatedAt = nowIso();
    writeDb(db);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaultData() {
    return {
      users: [],
      students: [],
      observations: [],
      reports: []
    };
  }

  function readDb() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return getDefaultData();
      }

      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        students: Array.isArray(parsed.students) ? parsed.students : [],
        observations: Array.isArray(parsed.observations) ? parsed.observations : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : []
      };
    } catch {
      return getDefaultData();
    }
  }

  function writeDb(data) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function ensureSeedData() {
    const db = readDb();
    if (db.users.some((user) => user.username === "adm")) {
      return;
    }

    const createdAt = nowIso();
    db.users.push({
      id: createId(),
      username: "adm",
      fullName: "Administrador",
      email: "adm@edusentir.local",
      passwordHash: await hashPassword("123"),
      role: "admin",
      phone: "",
      createdAt,
      updatedAt: createdAt
    });

    writeDb(db);
  }

  function mapUserRow(user) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt
    };
  }

  function mapObservationRow(observation) {
    return {
      id: observation.id,
      studentId: observation.studentId,
      date: observation.date,
      author: observation.author,
      context: observation.context,
      behaviorNotes: observation.behaviorNotes,
      progressNotes: observation.progressNotes,
      emotions: Array.isArray(observation.emotions) ? observation.emotions : [],
      communicationScore: observation.communicationScore,
      autonomyScore: observation.autonomyScore,
      socialScore: observation.socialScore,
      motorScore: observation.motorScore,
      createdAt: observation.createdAt
    };
  }

  function mapStudentRow(student, observations) {
    return {
      id: student.id,
      fullName: student.fullName,
      age: student.age,
      supportType: student.supportType,
      diagnosis: student.diagnosis,
      guardianName: student.guardianName,
      goals: student.goals,
      createdAt: student.createdAt,
      observations
    };
  }

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

    const items = areas
      .filter((area) => getAverageScore(observations, area.key) < 3)
      .map((area) => `Reforcar estrategias de apoio em ${area.label}.`);

    return items.length > 0 ? items : ["Nao ha pontos criticos no momento, mas o acompanhamento deve continuar."];
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

  function getFrequentEmotions(observations) {
    const totals = observations.reduce((accumulator, observation) => {
      const emotions = Array.isArray(observation.emotions) ? observation.emotions : [];
      emotions.forEach((emotion) => {
        accumulator.set(emotion, (accumulator.get(emotion) || 0) + 1);
      });
      return accumulator;
    }, new Map());

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
      .slice(0, 4)
      .map(([emotion]) => emotion);
  }

  function getEmotionalMessage(observations) {
    const frequentEmotions = getFrequentEmotions(observations);
    if (frequentEmotions.length === 0) {
      return "Ainda nao existem registros emocionais suficientes para leitura do comportamento afetivo.";
    }

    if (frequentEmotions.length === 1) {
      return `O estado emocional mais recorrente nas observacoes foi ${frequentEmotions[0].toLowerCase()}.`;
    }

    return `Os estados emocionais mais frequentes foram ${frequentEmotions.slice(0, -1).join(", ").toLowerCase()} e ${frequentEmotions[frequentEmotions.length - 1].toLowerCase()}.`;
  }

  function buildReport(student) {
    const observations = [...student.observations].sort((a, b) => b.date.localeCompare(a.date));

    return {
      student,
      summary: {
        totalObservations: observations.length,
        communicationAverage: getAverageScore(observations, "communicationScore"),
        autonomyAverage: getAverageScore(observations, "autonomyScore"),
        socialAverage: getAverageScore(observations, "socialScore"),
        motorAverage: getAverageScore(observations, "motorScore"),
        progressMessage: getProgressMessage(observations),
        emotionalMessage: getEmotionalMessage(observations),
        frequentEmotions: getFrequentEmotions(observations)
      },
      strengths: getStrongPoints(observations),
      attentionPoints: getAreasForAttention(observations),
      latestObservations: observations.slice(0, 5)
    };
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
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Relatorio - ${escapeHtml(report.student.fullName)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2933; margin: 24px; }
            h1, h2, h3, h4 { margin: 0 0 10px; }
            .header { border-bottom: 2px solid #bf5b39; padding-bottom: 16px; margin-bottom: 24px; }
            .section { margin-bottom: 22px; padding: 18px; border: 1px solid #d9e2ec; border-radius: 12px; }
            .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .summary-card { padding: 14px; border-radius: 10px; background: #f7f3ee; border: 1px solid #ead8c9; }
            .summary-card strong { display: block; margin-top: 6px; font-size: 24px; }
            ul { margin: 0; padding-left: 20px; }
            .observation { border-top: 1px solid #e6e6e6; padding-top: 12px; margin-top: 12px; }
            .observation:first-child { border-top: none; margin-top: 0; padding-top: 0; }
            .muted { color: #52606d; }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatorio de desenvolvimento</h1>
            <p class="muted">Aluno: ${escapeHtml(report.student.fullName)} | Responsavel: ${escapeHtml(report.student.guardianName)}</p>
            <p class="muted">Tipo de suporte: ${escapeHtml(report.student.supportType)} | Gerado em: ${formatDate(getTodayLocalDate())}</p>
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
            <h3>Emocional do aluno</h3>
            <p class="muted">${escapeHtml(report.summary.emotionalMessage)}</p>
            <p class="muted">Emocoes recorrentes: ${escapeHtml((report.summary.frequentEmotions || []).join(", ") || "Nao informado")}</p>
          </section>
          <section class="section">
            <h3>Ultimas observacoes</h3>
            ${report.latestObservations.length === 0
              ? "<p class='muted'>Nao ha observacoes registradas.</p>"
              : report.latestObservations.map((observation) => `
                  <div class="observation">
                    <h4>${escapeHtml(formatDate(observation.date))} - ${escapeHtml(observation.author || "Nao informado")}</h4>
                    <p><strong>Contexto:</strong> ${escapeHtml(observation.context || "Nao informado")}</p>
                    <p><strong>Comportamentos:</strong> ${escapeHtml(observation.behaviorNotes)}</p>
                    <p><strong>Avancos:</strong> ${escapeHtml(observation.progressNotes || "Nao informado")}</p>
                    <p><strong>Emocional:</strong> ${escapeHtml((observation.emotions || []).join(", ") || "Nao informado")}</p>
                  </div>
                `).join("")}
          </section>
        </body>
      </html>
    `;
  }

  function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(String(text || ""), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function buildReportPdf(report) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    function ensureSpace(required = 20) {
      if (y + required <= pageHeight - margin) {
        return;
      }

      doc.addPage();
      y = 18;
    }

    doc.setFillColor(20, 35, 68);
    doc.roundedRect(margin, y, contentWidth, 26, 4, 4, "F");
    doc.setTextColor(248, 251, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatorio de desenvolvimento", margin + 6, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Aluno: ${report.student.fullName}`, margin + 6, y + 17);
    doc.text(`Responsavel: ${report.student.guardianName}`, margin + 6, y + 22);
    y += 34;

    doc.setTextColor(31, 41, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumo geral", margin, y);
    y += 8;

    const summaryItems = [
      ["Comunicacao", report.summary.communicationAverage],
      ["Autonomia", report.summary.autonomyAverage],
      ["Interacao social", report.summary.socialAverage],
      ["Motor", report.summary.motorAverage]
    ];

    const cardWidth = (contentWidth - 6) / 2;
    const cardHeight = 18;
    summaryItems.forEach(([label, value], index) => {
      const cardX = margin + (index % 2) * (cardWidth + 6);
      const cardY = y + Math.floor(index / 2) * (cardHeight + 6);
      doc.setDrawColor(222, 232, 245);
      doc.setFillColor(247, 249, 253);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(label), cardX + 4, cardY + 7);
      doc.setFontSize(14);
      doc.text(String(value), cardX + 4, cardY + 14);
    });
    y += 2 * (cardHeight + 6) + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    y = addWrappedText(doc, report.summary.progressMessage, margin, y, contentWidth, 5.5);
    y += 3;
    doc.text(`Total de registros considerados: ${report.summary.totalObservations}`, margin, y);
    y += 10;

    function addListSection(title, items) {
      ensureSpace(26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.text(title, margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      items.forEach((item) => {
        ensureSpace(12);
        doc.circle(margin + 2, y - 1.2, 0.9, "F");
        y = addWrappedText(doc, item, margin + 6, y, contentWidth - 6, 5.5);
        y += 1.5;
      });
      y += 4;
    }

    addListSection("Pontos fortes", report.strengths);
    addListSection("Pontos de atencao", report.attentionPoints);

    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Emocional do aluno", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    y = addWrappedText(doc, report.summary.emotionalMessage, margin, y, contentWidth, 5.5);
    y += 3;
    y = addWrappedText(
      doc,
      `Emocoes recorrentes: ${(report.summary.frequentEmotions || []).join(", ") || "Nao informado"}`,
      margin,
      y,
      contentWidth,
      5.5
    );
    y += 8;

    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Ultimas observacoes", margin, y);
    y += 8;

    const observations = report.latestObservations.length
      ? report.latestObservations
      : [{
          date: "",
          author: "Nao informado",
          context: "Nao informado",
          behaviorNotes: "Nao ha observacoes registradas.",
          progressNotes: "Nao informado",
          emotions: []
        }];

    observations.forEach((observation) => {
      ensureSpace(38);
      const startY = y;
      doc.setDrawColor(222, 232, 245);
      doc.setFillColor(251, 252, 254);
      doc.roundedRect(margin, startY, contentWidth, 30, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(`${formatDate(observation.date)} - ${observation.author || "Nao informado"}`, margin + 4, startY + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.8);
      let innerY = startY + 13;
      innerY = addWrappedText(doc, `Contexto: ${observation.context || "Nao informado"}`, margin + 4, innerY, contentWidth - 8, 4.8);
      innerY = addWrappedText(doc, `Comportamentos: ${observation.behaviorNotes}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
      innerY = addWrappedText(doc, `Avancos: ${observation.progressNotes || "Nao informado"}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
      innerY = addWrappedText(doc, `Emocional: ${(observation.emotions || []).join(", ") || "Nao informado"}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
      const usedHeight = Math.max(30, innerY - startY + 4);
      if (usedHeight > 30) {
        doc.setFillColor(251, 252, 254);
        doc.roundedRect(margin, startY, contentWidth, usedHeight, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text(`${formatDate(observation.date)} - ${observation.author || "Nao informado"}`, margin + 4, startY + 7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.8);
        innerY = startY + 13;
        innerY = addWrappedText(doc, `Contexto: ${observation.context || "Nao informado"}`, margin + 4, innerY, contentWidth - 8, 4.8);
        innerY = addWrappedText(doc, `Comportamentos: ${observation.behaviorNotes}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
        innerY = addWrappedText(doc, `Avancos: ${observation.progressNotes || "Nao informado"}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
        innerY = addWrappedText(doc, `Emocional: ${(observation.emotions || []).join(", ") || "Nao informado"}`, margin + 4, innerY + 1.5, contentWidth - 8, 4.8);
        y = innerY + 6;
      } else {
        y = startY + usedHeight + 6;
      }
    });

    return doc;
  }

  function buildDailyStudentReport(payload, students) {
    const studentId = payload.studentId?.trim();
    const dailyNotes = payload.dailyNotes?.trim();

    if (!studentId) {
      throw new Error("Selecione um aluno para gerar o bilhete diario.");
    }

    if (!dailyNotes) {
      throw new Error("Escreva a observacao do dia antes de gerar o bilhete.");
    }

    const student = students.find((item) => item.id === studentId);
    if (!student) {
      throw new Error("Aluno nao encontrado para gerar o bilhete diario.");
    }

    return {
      student,
      date: getTodayLocalDate(),
      dailyNotes,
      message: `Hoje ${student.fullName} apresentou o seguinte acompanhamento: ${dailyNotes}`
    };
  }

  function buildDailyReportHtml(report) {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bilhete diario - ${escapeHtml(report.student.fullName)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2933; margin: 24px; }
            h1, h2, h3 { margin: 0 0 10px; }
            .header { border-bottom: 2px solid #bf5b39; padding-bottom: 16px; margin-bottom: 24px; }
            .section { margin-bottom: 18px; padding: 18px; border: 1px solid #d9e2ec; border-radius: 12px; }
            .muted { color: #52606d; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bilhete diario</h1>
            <p class="muted">Aluno: ${escapeHtml(report.student.fullName)} | Responsavel: ${escapeHtml(report.student.guardianName)}</p>
            <p class="muted">Data: ${escapeHtml(formatDate(report.date))}</p>
          </div>
          <section class="section">
            <h2>Resumo para a familia</h2>
            <p>${escapeHtml(report.message)}</p>
          </section>
          <section class="section">
            <h3>Observacao registrada</h3>
            <p>${escapeHtml(report.dailyNotes)}</p>
          </section>
        </body>
      </html>
    `;
  }

  function buildDailyReportPdf(report) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 20;

    doc.setFillColor(20, 35, 68);
    doc.roundedRect(margin, y, contentWidth, 24, 4, 4, "F");
    doc.setTextColor(248, 251, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Bilhete diario", margin + 6, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Aluno: ${report.student.fullName}`, margin + 6, y + 17);
    doc.text(`Data: ${formatDate(report.date)}`, margin + 6, y + 21);
    y += 34;

    doc.setTextColor(31, 41, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Resumo para a familia", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    y = addWrappedText(doc, report.message, margin, y, contentWidth, 5.5);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Observacao registrada", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    addWrappedText(doc, report.dailyNotes, margin, y, contentWidth, 5.5);
    return doc;
  }

  function sortByCreatedDesc(items) {
    return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function getCurrentSession() {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setCurrentSession(user) {
    if (!user) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(mapUserRow(user)));
  }

  function requireAuthenticatedUser() {
    const session = getCurrentSession();
    if (!session) {
      throw new Error("Faca login para continuar.");
    }

    return session;
  }

  function requireAdmin() {
    const user = requireAuthenticatedUser();
    if (user.role !== "admin") {
      throw new Error("Apenas administradores podem executar esta acao.");
    }

    return user;
  }

  function validateRole(role) {
    if (!ROLES.includes(role)) {
      throw new Error("Selecione um perfil valido.");
    }
  }

  function validateNonAdminRole(role) {
    validateRole(role);
    if (role === "admin") {
      throw new Error("Nao e permitido cadastrar usuarios com perfil administrador.");
    }
  }

  function validateAge(age) {
    if (age === null || age === undefined || age === "") {
      return null;
    }

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      throw new Error("Informe uma idade valida entre 0 e 120 anos.");
    }

    return parsedAge;
  }

  function validateScore(score, label) {
    const parsedScore = Number(score);
    if (!Number.isInteger(parsedScore) || parsedScore < 1 || parsedScore > 5) {
      throw new Error(`Informe uma nota valida de 1 a 5 para ${label}.`);
    }

    return parsedScore;
  }

  async function login(payload) {
    await ensureSeedData();
    const username = payload.username?.trim();
    const password = payload.password?.trim();

    if (!username || !password) {
      throw new Error("Informe usuario e senha.");
    }

    const db = readDb();
    const user = db.users.find((item) => item.username === username);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new Error("Usuario ou senha invalidos.");
    }

    await upgradePasswordHashIfNeeded(db, user, password);
    setCurrentSession(user);
    return mapUserRow(user);
  }

  async function listUsers() {
    requireAuthenticatedUser();
    const db = readDb();
    return db.users
      .map(mapUserRow)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }

  async function createUser(payload) {
    requireAdmin();
    const db = readDb();
    const username = payload.username?.trim();
    const fullName = payload.fullName?.trim();
    const email = payload.email?.trim() || null;
    const password = payload.password?.trim();
    const role = payload.role?.trim();
    const phone = payload.phone?.trim() || null;

    if (!username || !fullName || !password || !role) {
      throw new Error("Usuario, nome completo, senha e perfil sao obrigatorios.");
    }

    validateNonAdminRole(role);

    if (db.users.some((user) => user.username === username)) {
      throw new Error("Ja existe um usuario com esse login.");
    }

    if (email && db.users.some((user) => user.email && user.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Ja existe um usuario com esse e-mail.");
    }

    const createdAt = nowIso();
    const user = {
      id: createId(),
      username,
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role,
      phone,
      createdAt,
      updatedAt: createdAt
    };

    db.users.push(user);
    writeDb(db);
    return mapUserRow(user);
  }

  async function registerUser(payload) {
    const db = readDb();
    const username = payload.username?.trim();
    const fullName = payload.fullName?.trim();
    const email = payload.email?.trim() || null;
    const password = payload.password?.trim();
    const role = payload.role?.trim();
    const phone = payload.phone?.trim() || null;

    if (!username || !fullName || !password || !role) {
      throw new Error("Usuario, nome completo, senha e perfil sao obrigatorios.");
    }

    validateNonAdminRole(role);

    if (db.users.some((user) => user.username === username)) {
      throw new Error("Ja existe um usuario com esse login.");
    }

    if (email && db.users.some((user) => user.email && user.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Ja existe um usuario com esse e-mail.");
    }

    const createdAt = nowIso();
    const user = {
      id: createId(),
      username,
      fullName,
      email,
      passwordHash: await hashPassword(password),
      role,
      phone,
      createdAt,
      updatedAt: createdAt
    };

    db.users.push(user);
    writeDb(db);
    return mapUserRow(user);
  }

  async function deleteUser(payload) {
    const requester = requireAdmin();
    const targetUserId = payload.targetUserId?.trim();

    if (!targetUserId) {
      throw new Error("Selecione um usuario para excluir.");
    }

    if (requester.id === targetUserId) {
      throw new Error("Voce nao pode excluir o usuario logado.");
    }

    const db = readDb();
    const targetUser = db.users.find((user) => user.id === targetUserId);
    if (!targetUser) {
      throw new Error("Usuario nao encontrado.");
    }

    if (targetUser.role === "admin") {
      const adminCount = db.users.filter((user) => user.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Nao e permitido excluir o ultimo administrador do sistema.");
      }
    }

    db.users = db.users.filter((user) => user.id !== targetUserId);
    writeDb(db);
    return { success: true };
  }

  async function listStudents() {
    requireAuthenticatedUser();
    const db = readDb();
    const observationsByStudent = db.observations.reduce((accumulator, item) => {
      const mappedObservation = mapObservationRow(item);
      const existing = accumulator.get(item.studentId) || [];
      existing.push(mappedObservation);
      accumulator.set(item.studentId, existing);
      return accumulator;
    }, new Map());

    return db.students
      .map((student) => mapStudentRow(student, sortByCreatedDesc(observationsByStudent.get(student.id) || [])))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }

  async function createStudent(payload) {
    requireAuthenticatedUser();
    const fullName = payload.fullName?.trim();
    const supportType = payload.supportType?.trim();
    const guardianName = payload.guardianName?.trim();

    if (!fullName || !supportType || !guardianName) {
      throw new Error("Nome, tipo de suporte e responsavel sao obrigatorios.");
    }

    const db = readDb();
    const createdAt = nowIso();
    const student = {
      id: createId(),
      fullName,
      age: validateAge(payload.age),
      supportType,
      diagnosis: payload.diagnosis?.trim() || null,
      guardianName,
      goals: payload.goals?.trim() || null,
      createdAt,
      updatedAt: createdAt
    };

    db.students.push(student);
    writeDb(db);
    return mapStudentRow(student, []);
  }

  async function deleteStudent(payload) {
    requireAdmin();
    const targetStudentId = payload.targetStudentId?.trim();

    if (!targetStudentId) {
      throw new Error("Selecione um aluno para excluir.");
    }

    const db = readDb();
    const studentExists = db.students.some((student) => student.id === targetStudentId);
    if (!studentExists) {
      throw new Error("Aluno nao encontrado.");
    }

    db.students = db.students.filter((student) => student.id !== targetStudentId);
    db.observations = db.observations.filter((observation) => observation.studentId !== targetStudentId);
    db.reports = db.reports.filter((report) => report.studentId !== targetStudentId);
    writeDb(db);
    return { success: true };
  }

  async function addObservation(payload) {
    requireAuthenticatedUser();
    const studentId = payload.studentId?.trim();
    const date = payload.date?.trim();
    const author = payload.author?.trim();
    const behaviorNotes = payload.behaviorNotes?.trim();

    if (!studentId || !date || !author || !behaviorNotes) {
      throw new Error("Data, autor da observacao e descricao do comportamento sao obrigatorios.");
    }

    if (!parseLocalDateParts(date)) {
      throw new Error("Informe uma data valida para a observacao.");
    }

    const db = readDb();
    const studentExists = db.students.some((student) => student.id === studentId);
    if (!studentExists) {
      throw new Error("Aluno ou filho nao encontrado.");
    }

    const emotions = Array.isArray(payload.emotions)
      ? payload.emotions.filter((emotion, index, array) => ALLOWED_EMOTIONS.includes(emotion) && array.indexOf(emotion) === index)
      : [];

    const createdAt = nowIso();
    const observation = {
      id: createId(),
      studentId,
      date,
      author,
      context: payload.context?.trim() || null,
      behaviorNotes,
      progressNotes: payload.progressNotes?.trim() || null,
      emotions,
      communicationScore: validateScore(payload.communicationScore, "comunicacao"),
      autonomyScore: validateScore(payload.autonomyScore, "autonomia"),
      socialScore: validateScore(payload.socialScore, "interacao social"),
      motorScore: validateScore(payload.motorScore, "desenvolvimento motor"),
      createdAt,
      updatedAt: createdAt
    };

    db.observations.push(observation);
    writeDb(db);
    return mapObservationRow(observation);
  }

  async function generateStudentReport(studentId) {
    requireAuthenticatedUser();
    const students = await listStudents();
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      throw new Error("Aluno ou filho nao encontrado para gerar o relatorio.");
    }

    const report = buildReport(student);
    const db = readDb();
    db.reports.push({
      id: createId(),
      studentId: student.id,
      reportDate: nowIso(),
      summary: report.summary.progressMessage,
      strengths: clone(report.strengths),
      attentionPoints: clone(report.attentionPoints),
      recommendations: ["Manter observacoes frequentes e revisar metas conforme a evolucao do estudante."],
      createdAt: nowIso()
    });
    writeDb(db);
    return report;
  }

  async function generateReportPdf(studentId) {
    const report = await generateStudentReport(studentId);
    const doc = buildReportPdf(report);
    const blob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(blob);
    const fileName = createPdfFileName(report.student.fullName);
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    return {
      opened: false,
      report,
      html: buildReportHtml(report),
      pdfUrl,
      fileName,
      pdfBase64
    };
  }

  async function generateDailyReportPdf(payload) {
    requireAuthenticatedUser();
    const students = await listStudents();
    const report = buildDailyStudentReport(payload, students);
    const doc = buildDailyReportPdf(report);
    const blob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(blob);
    const fileName = createPdfFileName(`${report.student.fullName}-bilhete-diario`);
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    return {
      opened: false,
      report,
      html: buildDailyReportHtml(report),
      pdfUrl,
      fileName,
      pdfBase64
    };
  }

  async function getDashboardData() {
    requireAuthenticatedUser();
    const db = readDb();
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const current = new Date();
      current.setHours(0, 0, 0, 0);
      current.setDate(current.getDate() - (6 - index));
      const offset = current.getTimezoneOffset() * 60000;
      const iso = new Date(current.getTime() - offset).toISOString().slice(0, 10);
      return {
        date: iso,
        label: formatDate(iso).slice(0, 5)
      };
    });

    const observationTimelineMap = db.observations.reduce((accumulator, observation) => {
      if (accumulator.has(observation.date)) {
        accumulator.set(observation.date, accumulator.get(observation.date) + 1);
      } else {
        accumulator.set(observation.date, 1);
      }
      return accumulator;
    }, new Map());

    const latestObservations = sortByCreatedDesc(db.observations)
      .slice(0, 5)
      .map((observation) => {
        const student = db.students.find((item) => item.id === observation.studentId);
        return {
          id: observation.id,
          date: observation.date,
          author: observation.author,
          context: observation.context,
          behaviorNotes: observation.behaviorNotes,
          studentName: student?.fullName || "Aluno removido"
        };
      });

    const averages = {
      communication: getAverageScore(db.observations, "communicationScore"),
      autonomy: getAverageScore(db.observations, "autonomyScore"),
      social: getAverageScore(db.observations, "socialScore"),
      motor: getAverageScore(db.observations, "motorScore")
    };

    const supportTypesMap = db.students.reduce((accumulator, student) => {
      accumulator.set(student.supportType, (accumulator.get(student.supportType) || 0) + 1);
      return accumulator;
    }, new Map());

    const rolesMap = db.users.reduce((accumulator, user) => {
      accumulator.set(user.role, (accumulator.get(user.role) || 0) + 1);
      return accumulator;
    }, new Map());

    return {
      totals: {
        userCount: db.users.length,
        studentCount: db.students.length,
        observationCount: db.observations.length,
        reportCount: db.reports.length
      },
      supportTypes: Array.from(supportTypesMap.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"))
        .slice(0, 5),
      userRoles: Array.from(rolesMap.entries())
        .map(([label, total]) => ({ label, total }))
        .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR")),
      averages,
      latestObservations,
      timeline: lastSevenDays.map((item) => ({
        ...item,
        total: observationTimelineMap.get(item.date) || 0
      }))
    };
  }

  async function logout() {
    setCurrentSession(null);
    return { success: true };
  }

  async function getSessionUser() {
    await ensureSeedData();
    const session = getCurrentSession();
    return session ? clone(session) : null;
  }

  window.appApi = {
    login,
    logout,
    getSessionUser,
    getDashboardData,
    listUsers,
    registerUser,
    createUser,
    deleteUser,
    listStudents,
    createStudent,
    deleteStudent,
    addObservation,
    generateReport: generateStudentReport,
    generateReportPdf,
    generateDailyReportPdf,
    formatDate,
    getTodayLocalDate
  };
})();
