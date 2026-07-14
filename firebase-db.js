// ============================================================
// firebase-db.js
// Reemplazo de codigo_gs_UGB.gs (doGet/doPost) + del bloque de sync de
// INDEX_FINAL.html. Misma forma de datos que ya usa appData[currentStudent],
// para que el reemplazo en el frontend sea "cambiar la llamada", no rediseñar.
// ============================================================

import { db } from './firebase-init.js';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ── Identificador de estudiante (mismo criterio que ya usas: nombre__carrera) ──
export function studentId(nombre, carrera) {
  return carrera ? `${nombre}__${carrera}` : nombre;
}

// ── Hash SHA-256 (mismo método que ya tenías en INDEX_FINAL.html / _sha256) ──
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// ESTUDIANTES (antes: hojas "Estudiantes" + "Passwords")
// ============================================================

export async function listarEstudiantes(carrera) {
  const col = collection(db, 'estudiantes');
  const q = carrera ? query(col, where('carrera', '==', carrera)) : col;
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().nombre);
}

export async function crearOCargarEstudiante(nombre, carrera) {
  const id  = studentId(nombre, carrera);
  const ref = doc(db, 'estudiantes', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre, carrera,
      passwordHash: null,
      horario: null,
      cyclesDone: {},
      specialCards: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id, isNew: true, data: null };
  }
  return { id, isNew: false, data: snap.data() };
}

export async function verificarPassword(nombre, carrera, claveTexto) {
  const ref  = doc(db, 'estudiantes', studentId(nombre, carrera));
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().passwordHash) return { existe: false };
  const hash = await sha256(claveTexto);
  return { existe: true, correcta: hash === snap.data().passwordHash };
}

export async function guardarPasswordHash(nombre, carrera, hash) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await setDoc(ref, { passwordHash: hash, updatedAt: serverTimestamp() }, { merge: true });
}

export async function eliminarEstudiante(nombre, carrera) {
  const id = studentId(nombre, carrera);
  // Borra subcolecciones primero (Firestore no borra en cascada solo).
  for (const sub of ['notas', 'eventos', 'asistencias']) {
    const snap = await getDocs(collection(db, 'estudiantes', id, sub));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length) await batch.commit();
  }
  await deleteDoc(doc(db, 'estudiantes', id));
}

export async function guardarHorario(nombre, carrera, horario) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { horario, updatedAt: serverTimestamp() });
}

export async function guardarCiclosDone(nombre, carrera, cyclesDone) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { cyclesDone, updatedAt: serverTimestamp() });
}

export async function guardarEspeciales(nombre, carrera, specialCards) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { specialCards, updatedAt: serverTimestamp() });
}

// ============================================================
// NOTAS (antes: hoja "Notas_<estudiante>") — escritura atómica con
// writeBatch: TODAS las materias se escriben/borran en una sola operación,
// nunca hay un estado intermedio a medio guardar (esto es lo que elimina
// la condición de carrera del sync viejo).
// ============================================================

export async function guardarNotas(nombre, carrera, notasArray) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'notas');
  const prev = await getDocs(col);
  const nuevosNums = new Set(notasArray.map(n => String(n.num)));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!nuevosNums.has(d.id)) batch.delete(d.ref); });
  notasArray.forEach(n => batch.set(doc(col, String(n.num)), n));
  await batch.commit();

  await updateDoc(doc(db, 'estudiantes', id), { updatedAt: serverTimestamp() });
}

export function escucharNotas(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'notas');
  return onSnapshot(col, (snap) => {
    callback(snap.docs.map(d => d.data()).sort((a, b) => Number(a.num) - Number(b.num)));
  });
}

// ============================================================
// EVENTOS / CALENDARIO (antes: hoja "Calendario_<estudiante>")
// ============================================================

export async function guardarEventos(nombre, carrera, eventosArray) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'eventos');
  const prev = await getDocs(col);
  const nuevosIds = new Set(eventosArray.map(ev => String(ev.id)));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!nuevosIds.has(d.id)) batch.delete(d.ref); });
  eventosArray.forEach(ev => batch.set(doc(col, String(ev.id)), ev));
  await batch.commit();
}

export function escucharEventos(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'eventos');
  return onSnapshot(col, (snap) => callback(snap.docs.map(d => d.data())));
}

// ============================================================
// ASISTENCIAS (antes: hoja "Asistencias_<estudiante>")
// ============================================================

export async function guardarAsistencia(nombre, carrera, fecha, registro) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera), 'asistencias', fecha);
  await setDoc(ref, registro);
}

export function escucharAsistencias(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'asistencias');
  return onSnapshot(col, (snap) => {
    const obj = {};
    snap.docs.forEach(d => { obj[d.id] = d.data(); });
    callback(obj);
  });
}

// ============================================================
// LISTENER MAESTRO — reemplaza fetchFromSheets()/_silentFetch() por completo.
// Un solo llamado deja abiertos los listeners de doc principal + subcolecciones.
// Devuelve una función para cerrarlos todos (llámala al cambiar de estudiante
// o cerrar sesión).
// ============================================================

export function escucharEstudiante(nombre, carrera, { onPerfil, onNotas, onEventos, onAsistencias }) {
  const id = studentId(nombre, carrera);
  const unsubs = [];

  unsubs.push(onSnapshot(doc(db, 'estudiantes', id), (snap) => {
    if (snap.exists() && onPerfil) onPerfil(snap.data());
  }));
  if (onNotas)       unsubs.push(escucharNotas(nombre, carrera, onNotas));
  if (onEventos)     unsubs.push(escucharEventos(nombre, carrera, onEventos));
  if (onAsistencias) unsubs.push(escucharAsistencias(nombre, carrera, onAsistencias));

  return () => unsubs.forEach(u => u());
}

// ============================================================
// CONFIG GLOBAL (antes: hoja "ConfigApp")
// ============================================================

export async function getShowAccountList() {
  const snap = await getDoc(doc(db, 'config', 'settings'));
  return snap.exists() ? (snap.data().showAccountList !== false) : true;
}

export async function setShowAccountList(visible) {
  await setDoc(doc(db, 'config', 'settings'), { showAccountList: visible }, { merge: true });
}

// ============================================================
// MODO AVANZADO — doble clic en el logo (Fase 3 del plan).
// Verifica/crea lo mínimo que la base de datos necesita para arrancar.
// Reporta cada paso vía onProgress (conéctalo a console.log desde el HTML).
// ============================================================

export async function initFirestoreDatabase(onProgress = () => {}) {
  onProgress('Verificando conexión a Firestore...');
  const configRef = doc(db, 'config', 'settings');
  const configSnap = await getDoc(configRef);

  if (!configSnap.exists()) {
    onProgress('Creando documento config/settings...');
    await setDoc(configRef, { showAccountList: true, version: '1.0', createdAt: serverTimestamp() });
  } else {
    onProgress('config/settings ya existe, no se toca.');
  }

  onProgress('Verificando colección estudiantes...');
  const someStudents = await getDocs(query(collection(db, 'estudiantes')));
  onProgress(`estudiantes: ${someStudents.size} documento(s) encontrados.`);

  onProgress('Todo listo. Las colecciones notas/eventos/asistencias se crean solas en cuanto el primer estudiante guarde datos.');
  return { ok: true, estudiantesExistentes: someStudents.size };
}
