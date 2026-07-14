import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCum-d6Z-kpxo5Kkrn3c_gY9orr_wSrEH8",
  authDomain: "ugb-pensum.firebaseapp.com",
  projectId: "ugb-pensum",
  storageBucket: "ugb-pensum.firebasestorage.app",
  messagingSenderId: "889412194588",
  appId: "1:889412194588:web:d3074ed0ebef5b2d816ad9"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ignoreUndefinedProperties: true — SIN esto, Firestore RECHAZA cualquier
// campo con valor `undefined` (el campo "nota" de un evento nuevo del
// calendario empieza como undefined hasta que el estudiante lo llena).
// Esto era justo la causa de "Error al guardar — reintentando..." SOLO en
// el calendario: notas/ciclos/etc. nunca tenían un campo undefined.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

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
