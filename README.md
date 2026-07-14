# UGB Pénsum — 100% Firebase (arranque desde cero)

`INDEX_FINAL.html` ya quedó conectado a Firebase. Google Sheets y Apps Script
quedaron completamente fuera del camino — ya no hace falta desplegar nada en
Apps Script para que esto funcione.

## Archivos y qué hace cada uno

| Archivo | Rol |
|---|---|
| `INDEX_FINAL.html` | Frontend. Ya editado: login, notas, calendario, horario — todo habla directo con Firestore en tiempo real. |
| `horarios.html` | Visor de horario standalone, sin cambios (no depende de Sheets ni de Firebase). |
| `firebase-init.js` | Conexión a Firebase (Firestore + Auth anónima). Ya tiene tus credenciales de `ugb-pensum`. |
| `firebase-db.js` | Todas las funciones de guardar/leer/escuchar datos en Firestore. |
| `Logotipo-horizontal-azul.png`, `logo2.png` | Logos que usa `INDEX_FINAL.html`. |
| `PLAN_MIGRACION_FIREBASE.md` | El plan original de 3 fases — ya ejecutado, queda como referencia. |
| `migrar-exportar.gs`, `migrar-importar.html` | **Ya no los necesitas** — eran para traer datos viejos de Sheets. Como decidiste arrancar todo nuevo, quedan sin usar. Bórralos o guárdalos por si acaso, no afectan nada si no los tocas. |

## Qué cambió dentro de `INDEX_FINAL.html`

- `syncToSheets()` / `fetchFromSheets()` — mismos nombres de función (para no
  tener que tocar los demás 3000 líneas del archivo que ya los llamaban), pero
  por dentro ahora escriben/leen Firestore en vez de Apps Script.
- El polling cada 3 segundos desapareció por completo. Ahora hay un listener
  en tiempo real (`onSnapshot`) — en cuanto guardas algo en un dispositivo,
  aparece solo en los demás, sin esperar ni recargar.
- Login/contraseña — mismo hash SHA-256 de antes (nombre+contraseña), ahora
  guardado en el documento del estudiante en Firestore.
- El modal viejo de "Configurar Google Sheets" ya no existe.
- **Doble clic en el logo** (login o header) → verifica/inicializa la base
  de datos en Firestore, con el progreso en la consola del navegador (F12).
  También disponible desde el menú ☰ → "⚙️ Verificar base de datos".
- El botón "¿Dónde estoy?" ahora siempre usa `horarios.html` directo (mismo
  origen), en vez de pasar por Apps Script — así se evita el bloqueo de
  cookies de terceros que daba problemas antes.

## Cómo desplegarlo (arranque limpio)

No necesitas Apps Script para nada de esto. Sube estos 5 archivos juntos a
cualquier hosting estático:

1. `INDEX_FINAL.html`
2. `horarios.html`
3. `firebase-init.js`
4. `firebase-db.js`
5. `Logotipo-horizontal-azul.png` y `logo2.png`

**Opción recomendada — Firebase Hosting** (mismo ecosistema, gratis para este tamaño de app):
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # elige el proyecto "ugb-pensum", carpeta pública = la que tenga estos archivos
firebase deploy
```
Te va a dar una URL tipo `https://ugb-pensum.web.app` — esa es la que compartes
con los estudiantes.

**Alternativas igual de válidas:** GitHub Pages, Netlify, Vercel, o incluso
abrir `INDEX_FINAL.html` con doble clic desde tu computadora (funciona local
también, ya que todo lo de Firebase se conecta por https, no por rutas locales).

## Primer uso

1. Abre la URL de tu hosting (o el archivo local).
2. Doble clic en el logo → confirma → revisa la consola (F12): debe decir
   "Base de datos lista".
3. Elige carrera, crea tu primera cuenta (nombre + contraseña) — como es
   la primera vez, el sistema la crea sola.
4. Guarda una nota y ábrelo en otro dispositivo/pestaña: debe aparecer sin
   recargar.

## Verificación

- [ ] Consola del navegador no muestra errores al cargar.
- [ ] Doble clic en el logo → log de inicialización visible.
- [ ] Cuenta nueva se crea y el login funciona.
- [ ] Guardar una nota se refleja en otro dispositivo sin recargar (esto es
      justo lo que antes fallaba).
- [ ] Firebase Console → Firestore → colección `estudiantes` va llenándose
      a medida que la gente usa el sistema.
- [ ] "¿Dónde estoy?" abre el horario sin pantalla en blanco.

## Pendiente / a tu criterio

- Las reglas de seguridad de Firestore actuales (`allow read, write: if
  request.auth != null`) son mínimas — cualquier usuario autenticado
  anónimamente puede leer/escribir cualquier documento. Para más adelante,
  podrías restringir por `request.auth.uid` si migras a contraseñas reales
  de Firebase Auth en vez del hash propio — no es urgente para arrancar.
- `codigo_gs_UGB.gs` (el backend viejo de Apps Script) y todo lo relacionado
  a Sheets queda completamente en desuso. Puedes archivar ese proyecto de
  Apps Script o dejarlo apagado, ya no lo toca nada de este sistema.
