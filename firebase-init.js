// ============================================================
// firebase-init.js
// Inicializa Firebase (Firestore + Auth anónima) para UGB Pénsum.
// Reemplaza toda la lógica de "config.appsScriptUrl" de INDEX_FINAL.html.
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

// Credenciales del proyecto ugb-pensum (Firebase Console → Configuración del proyecto).
const firebaseConfig = {
  apiKey: "AIzaSyCum-d6Z-kpxo5Kkrn3c_gY9orr_wSrEH8",
  authDomain: "ugb-pensum.firebaseapp.com",
  projectId: "ugb-pensum",
  storageBucket: "ugb-pensum.firebasestorage.app",
  messagingSenderId: "889412194588",
  appId: "1:889412194588:web:d3074ed0ebef5b2d816ad9"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Cache local + cola de escrituras offline (Firestore lo maneja solo,
// esto es lo que reemplaza tu "syncing..." manual).
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('[Firebase] Persistencia offline solo puede activarse en una pestaña a la vez.');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] Este navegador no soporta persistencia offline de Firestore.');
  }
});

// Autenticación anónima automática al cargar la página.
// (Cada dispositivo/navegador obtiene su propio usuario anónimo; el estudiante
// se identifica igual que antes por nombre+contraseña, no por este UID.)
let _authReadyResolve;
export const authReady = new Promise((res) => { _authReadyResolve = res; });

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('[Firebase] Sesión anónima activa:', user.uid);
    _authReadyResolve(user);
  } else {
    signInAnonymously(auth).catch((err) => {
      console.error('[Firebase] Error al autenticar:', err);
    });
  }
});
