const { query } = require("./db");
const { buildReport } = require("./report-service");
const crypto = require("crypto");

const PASSWORD_HASH_PREFIX = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 210000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, 32, "sha256");
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_HASH_ITERATIONS}$${salt.toString("base64")}$${digest.toString("base64")}`;
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyPassword(password, passwordHash) {
  if (String(passwordHash || "").startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    try {
      const [, iterationsRaw, saltRaw, digestRaw] = String(passwordHash).split("$");
      const iterations = Number(iterationsRaw);
      if (!Number.isInteger(iterations) || !saltRaw || !digestRaw) {
        return false;
      }

      const digest = crypto.pbkdf2Sync(password, Buffer.from(saltRaw, "base64"), iterations, 32, "sha256");
      return safeCompare(digest.toString("base64"), digestRaw);
    } catch {
      return false;
    }
  }

  return safeCompare(password, passwordHash);
}

async function initializeDatabase() {
  await query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(60) UNIQUE,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL CHECK (role IN ('parent', 'teacher', 'guardian', 'admin', 'medical')),
      phone VARCHAR(30),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(150) NOT NULL,
      birth_date DATE,
      age INTEGER CHECK (age >= 0),
      support_type VARCHAR(120) NOT NULL,
      diagnosis TEXT,
      guardian_name VARCHAR(150) NOT NULL,
      goals TEXT,
      notes TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS observations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      author_name VARCHAR(150),
      observation_date DATE NOT NULL,
      context VARCHAR(120),
      behavior_notes TEXT NOT NULL,
      progress_notes TEXT,
      communication_score INTEGER NOT NULL CHECK (communication_score BETWEEN 1 AND 5),
      autonomy_score INTEGER NOT NULL CHECK (autonomy_score BETWEEN 1 AND 5),
      social_score INTEGER NOT NULL CHECK (social_score BETWEEN 1 AND 5),
      motor_score INTEGER NOT NULL CHECK (motor_score BETWEEN 1 AND 5),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      report_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      summary TEXT NOT NULL,
      strengths TEXT,
      attention_points TEXT,
      recommendations TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(60)");
  await query("ALTER TABLE users ALTER COLUMN email DROP NOT NULL");
  await query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
  await query(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('parent', 'teacher', 'guardian', 'admin', 'medical'))
  `);
  await query("ALTER TABLE observations ADD COLUMN IF NOT EXISTS author_name VARCHAR(150)");
  await query("CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name)");
  await query("CREATE INDEX IF NOT EXISTS idx_observations_student_id ON observations(student_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(observation_date)");
  await query("CREATE INDEX IF NOT EXISTS idx_reports_student_id ON reports(student_id)");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");

  await query(
    `
      INSERT INTO users (username, full_name, email, password_hash, role, phone)
      VALUES ('adm', 'Administrador', 'adm@edusentir.local', $1, 'admin', '')
      ON CONFLICT (username) DO NOTHING
    `,
    [hashPassword(process.env.LEGACY_ADMIN_PASSWORD || crypto.randomBytes(32).toString("hex"))]
  );

  await query(`
    UPDATE users
    SET email = 'adm@edusentir.local'
    WHERE username = 'adm'
  `);
}

function mapUserRow(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    fullName: userRow.full_name,
    email: userRow.email,
    role: userRow.role,
    phone: userRow.phone,
    createdAt: userRow.created_at
  };
}

function mapStudentRow(studentRow, observations) {
  return {
    id: studentRow.id,
    fullName: studentRow.full_name,
    age: studentRow.age,
    supportType: studentRow.support_type,
    diagnosis: studentRow.diagnosis,
    guardianName: studentRow.guardian_name,
    goals: studentRow.goals,
    createdAt: studentRow.created_at,
    observations
  };
}

function mapObservationRow(observationRow) {
  return {
    id: observationRow.id,
    studentId: observationRow.student_id,
    date: observationRow.observation_date,
    author: observationRow.author_name,
    context: observationRow.context,
    behaviorNotes: observationRow.behavior_notes,
    progressNotes: observationRow.progress_notes,
    communicationScore: observationRow.communication_score,
    autonomyScore: observationRow.autonomy_score,
    socialScore: observationRow.social_score,
    motorScore: observationRow.motor_score,
    createdAt: observationRow.created_at
  };
}

async function listStudents() {
  const studentsResult = await query("SELECT * FROM students ORDER BY full_name ASC");
  const observationsResult = await query("SELECT * FROM observations ORDER BY observation_date DESC, created_at DESC");

  const observationsByStudent = observationsResult.rows.reduce((accumulator, row) => {
    const mappedObservation = mapObservationRow(row);
    const existing = accumulator.get(row.student_id) || [];
    existing.push(mappedObservation);
    accumulator.set(row.student_id, existing);
    return accumulator;
  }, new Map());

  return studentsResult.rows.map((studentRow) =>
    mapStudentRow(studentRow, observationsByStudent.get(studentRow.id) || [])
  );
}

async function listUsers() {
  const result = await query(
    "SELECT id, username, full_name, email, role, phone, created_at FROM users ORDER BY full_name ASC"
  );
  return result.rows.map(mapUserRow);
}

async function getDashboardData() {
  const [
    totalsResult,
    supportTypesResult,
    rolesResult,
    scoreAveragesResult,
    latestObservationsResult,
    observationTimelineResult
  ] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS user_count,
        (SELECT COUNT(*) FROM students) AS student_count,
        (SELECT COUNT(*) FROM observations) AS observation_count,
        (SELECT COUNT(*) FROM reports) AS report_count
    `),
    query(`
      SELECT support_type, COUNT(*)::int AS total
      FROM students
      GROUP BY support_type
      ORDER BY total DESC, support_type ASC
      LIMIT 5
    `),
    query(`
      SELECT role, COUNT(*)::int AS total
      FROM users
      GROUP BY role
      ORDER BY total DESC, role ASC
    `),
    query(`
      SELECT
        COALESCE(ROUND(AVG(communication_score)::numeric, 1), 0) AS communication_average,
        COALESCE(ROUND(AVG(autonomy_score)::numeric, 1), 0) AS autonomy_average,
        COALESCE(ROUND(AVG(social_score)::numeric, 1), 0) AS social_average,
        COALESCE(ROUND(AVG(motor_score)::numeric, 1), 0) AS motor_average
      FROM observations
    `),
    query(`
      SELECT
        o.id,
        o.observation_date,
        o.author_name,
        o.context,
        o.behavior_notes,
        s.full_name AS student_name
      FROM observations o
      INNER JOIN students s ON s.id = o.student_id
      ORDER BY o.observation_date DESC, o.created_at DESC
      LIMIT 5
    `),
    query(`
      SELECT
        observation_date,
        COUNT(*)::int AS total
      FROM observations
      WHERE observation_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY observation_date
      ORDER BY observation_date ASC
    `)
  ]);

  const totals = totalsResult.rows[0];
  const averages = scoreAveragesResult.rows[0];
  const timelineMap = new Map(
    observationTimelineResult.rows.map((row) => [
      new Date(row.observation_date).toISOString().slice(0, 10),
      row.total
    ])
  );

  const timeline = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const isoDate = date.toISOString().slice(0, 10);

    return {
      date: isoDate,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date),
      total: timelineMap.get(isoDate) || 0
    };
  });

  return {
    totals: {
      userCount: Number(totals.user_count),
      studentCount: Number(totals.student_count),
      observationCount: Number(totals.observation_count),
      reportCount: Number(totals.report_count)
    },
    supportTypes: supportTypesResult.rows.map((row) => ({
      label: row.support_type,
      total: row.total
    })),
    userRoles: rolesResult.rows.map((row) => ({
      label: row.role,
      total: row.total
    })),
    averages: {
      communication: Number(averages.communication_average),
      autonomy: Number(averages.autonomy_average),
      social: Number(averages.social_average),
      motor: Number(averages.motor_average)
    },
    latestObservations: latestObservationsResult.rows.map((row) => ({
      id: row.id,
      date: row.observation_date,
      author: row.author_name,
      context: row.context,
      behaviorNotes: row.behavior_notes,
      studentName: row.student_name
    })),
    timeline
  };
}

async function authenticateUser(payload) {
  const username = payload.username?.trim();
  const password = payload.password?.trim();

  if (!username || !password) {
    throw new Error("Informe usuario e senha.");
  }

  const result = await query(
    `
      SELECT id, username, full_name, email, role, phone, password_hash, created_at
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [username]
  );

  if (result.rowCount === 0 || !verifyPassword(password, result.rows[0].password_hash)) {
    throw new Error("Usuario ou senha invalidos.");
  }

  if (!String(result.rows[0].password_hash || "").startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    await query("UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [
      hashPassword(password),
      result.rows[0].id
    ]);
  }

  return mapUserRow(result.rows[0]);
}

async function createUser(payload) {
  const user = {
    username: payload.username?.trim(),
    fullName: payload.fullName?.trim(),
    email: payload.email?.trim() || null,
    password: payload.password?.trim(),
    role: payload.role?.trim(),
    phone: payload.phone?.trim() || null
  };

  if (!user.username || !user.fullName || !user.password || !user.role) {
    throw new Error("Usuario, nome completo, senha e perfil sao obrigatorios.");
  }

  const result = await query(
    `
      INSERT INTO users (username, full_name, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, full_name, email, role, phone, created_at
    `,
    [user.username, user.fullName, user.email, hashPassword(user.password), user.role, user.phone]
  );

  return mapUserRow(result.rows[0]);
}

async function deleteUser(payload) {
  const requesterUserId = payload.requesterUserId?.trim();
  const requesterRole = payload.requesterRole?.trim();
  const targetUserId = payload.targetUserId?.trim();

  if (requesterRole !== "admin") {
    throw new Error("Apenas administradores podem excluir usuarios.");
  }

  if (!targetUserId) {
    throw new Error("Selecione um usuario para excluir.");
  }

  if (requesterUserId === targetUserId) {
    throw new Error("Voce nao pode excluir o usuario logado.");
  }

  const targetUserResult = await query("SELECT id, role FROM users WHERE id = $1", [targetUserId]);

  if (targetUserResult.rowCount === 0) {
    throw new Error("Usuario nao encontrado.");
  }

  if (targetUserResult.rows[0].role === "admin") {
    const adminCountResult = await query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'");
    if (Number(adminCountResult.rows[0].total) <= 1) {
      throw new Error("Nao e permitido excluir o ultimo administrador do sistema.");
    }
  }

  await query("DELETE FROM users WHERE id = $1", [targetUserId]);
  return { success: true };
}

async function createStudent(payload) {
  const student = {
    fullName: payload.fullName?.trim(),
    age: payload.age ? Number(payload.age) : null,
    supportType: payload.supportType?.trim(),
    diagnosis: payload.diagnosis?.trim() || null,
    guardianName: payload.guardianName?.trim(),
    goals: payload.goals?.trim() || null
  };

  if (!student.fullName || !student.supportType || !student.guardianName) {
    throw new Error("Nome, tipo de suporte e responsavel sao obrigatorios.");
  }

  const result = await query(
    `
      INSERT INTO students (
        full_name,
        age,
        support_type,
        diagnosis,
        guardian_name,
        goals
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      student.fullName,
      student.age,
      student.supportType,
      student.diagnosis,
      student.guardianName,
      student.goals
    ]
  );

  return mapStudentRow(result.rows[0], []);
}

async function deleteStudent(payload) {
  const requesterRole = payload.requesterRole?.trim();
  const targetStudentId = payload.targetStudentId?.trim();

  if (requesterRole !== "admin") {
    throw new Error("Apenas administradores podem excluir alunos.");
  }

  if (!targetStudentId) {
    throw new Error("Selecione um aluno para excluir.");
  }

  const studentResult = await query("SELECT id FROM students WHERE id = $1", [targetStudentId]);

  if (studentResult.rowCount === 0) {
    throw new Error("Aluno nao encontrado.");
  }

  await query("DELETE FROM students WHERE id = $1", [targetStudentId]);
  return { success: true };
}

async function addObservation(payload) {
  const observation = {
    studentId: payload.studentId,
    date: payload.date,
    author: payload.author?.trim(),
    context: payload.context?.trim() || null,
    behaviorNotes: payload.behaviorNotes?.trim(),
    progressNotes: payload.progressNotes?.trim() || null,
    communicationScore: Number(payload.communicationScore),
    autonomyScore: Number(payload.autonomyScore),
    socialScore: Number(payload.socialScore),
    motorScore: Number(payload.motorScore)
  };

  if (!observation.studentId || !observation.date || !observation.author || !observation.behaviorNotes) {
    throw new Error("Data, autor da observacao e descricao do comportamento sao obrigatorios.");
  }

  const studentResult = await query("SELECT id FROM students WHERE id = $1", [observation.studentId]);

  if (studentResult.rowCount === 0) {
    throw new Error("Aluno ou filho nao encontrado.");
  }

  const result = await query(
    `
      INSERT INTO observations (
        student_id,
        author_name,
        observation_date,
        context,
        behavior_notes,
        progress_notes,
        communication_score,
        autonomy_score,
        social_score,
        motor_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      observation.studentId,
      observation.author,
      observation.date,
      observation.context,
      observation.behaviorNotes,
      observation.progressNotes,
      observation.communicationScore,
      observation.autonomyScore,
      observation.socialScore,
      observation.motorScore
    ]
  );

  return mapObservationRow(result.rows[0]);
}

async function generateStudentReport(studentId) {
  const students = await listStudents();
  const student = students.find((item) => item.id === studentId);

  if (!student) {
    throw new Error("Aluno ou filho nao encontrado para gerar o relatorio.");
  }

  const report = buildReport(student);

  await query(
    `
      INSERT INTO reports (
        student_id,
        summary,
        strengths,
        attention_points,
        recommendations
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      student.id,
      report.summary.progressMessage,
      report.strengths.join(" | "),
      report.attentionPoints.join(" | "),
      "Manter observacoes frequentes e revisar metas conforme a evolucao do estudante."
    ]
  );

  return report;
}

module.exports = {
  initializeDatabase,
  authenticateUser,
  createUser,
  createStudent,
  deleteUser,
  deleteStudent,
  getDashboardData,
  listUsers,
  listStudents,
  addObservation,
  generateStudentReport
};
