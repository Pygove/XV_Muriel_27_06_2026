# Proceso de creación — Invitación digital

---

## Archivos del template

| Archivo               | Propósito                                              | ¿Se modifica? |
|-----------------------|--------------------------------------------------------|---------------|
| `PROCESO.md`          | Este documento                                         | No            |
| `BRIEF.md`            | Brief de diseño para la IA (uno por proyecto)          | Sí            |
| `theme.css`           | Paleta, tipografías y decoración del tema              | Sí            |
| `styles.css`          | Layout estructural                                     | **No**        |
| `index.html`          | Invitación completa **para casamientos** (XV no lo usa)| Sí (casamiento)|
| `adulto.html`         | Invitación XV adulto — slug `/adulto`                  | Sí (XV)       |
| `teen.html`           | Invitación XV teen — slug `/teen`                      | Sí (XV)       |
| `save-the-date.html`  | Versión recortada: solo portada + música + hero        | Sí            |
| `despues-12.html`     | Invitación XV solo al baile post-medianoche — slug `/despues-12` | Sí (XV opcional) |
| `app.js`              | Lógica y bloque CONFIG                                 | Sí            |
| `.htaccess`           | Rewrites para URLs limpias (`/save-the-date`, `/despues-12`, `/teen`, `/adulto`) | No |
| `tests/`              | Tests automáticos del formulario (Playwright)          | No            |

---

## Paso 1 — Relevamiento

Recopilar del cliente antes de arrancar:

**Evento**
- [X] Tipo: XV años o casamiento
- [X] Nombre/s (con tildes y mayúsculas correctas)
- [X] Fecha, hora y timezone
- [X] Nombre del salón, dirección y link de Google Maps
- [X] Itinerario completo (horarios y descripción de cada momento)
- [X] Dress code
- [X] Datos bancarios: banco, alias, CBU
- [X] *(Solo XV)* Variante/s a crear: teen, adulto, o ambas (se sirven desde la misma carpeta en URLs distintas)

**Multimedia**
- [X] Canción (MP3)
- [X] Fotos para la galería (hasta 9)
- [X] Imagen de preview para redes (og:image), 1200×630 px

**Diseño**
- [X] Paleta de colores, referencias visuales, mood
- [X] Tipografías o palabras clave del estilo
- [X] Elementos decorativos deseados y no deseados

---

## Paso 2 — Setup del proyecto

1. Crear el repo del evento desde GitHub usando **"Use this template"** en el repo `invitation-template`. Nombre sugerido: `NombreEvento_DDMMAA` (ej: `XV_Sofia_110726`). Luego clonarlo localmente.

   > Si no aparece "Use this template", ir a Settings del repo template → marcar **Template repository**.

2. Comprimir la canción a mono y eliminar metadata, luego copiarla como `music.mp3`:
   ```bash
   ffmpeg -i input.mp3 -ac 1 -map_metadata -1 -vn music.mp3
   ```

3. Completar el bloque `CONFIG` al inicio de `app.js` con todos los datos del evento. Setear `tipo: 'xv'` o `tipo: 'casamiento'`. Ya **no existe** `CONFIG.variante`: la variante teen/adulto la determina el HTML que se cargó.

4. Eliminar los HTMLs que **no aplican** al evento:
   - Para XV: borrar `index.html` (no se usa). Mantener `adulto.html`, `teen.html` y opcionalmente `despues-12.html` (solo si hay invitados al baile). Borrar `despues-12.html` si no aplica.
   - Para casamiento: borrar `adulto.html`, `teen.html` y `despues-12.html`. Mantener `index.html`.
   - `save-the-date.html` es opcional para ambos casos.

5. Editar el itinerario en el/los HTML que quedan (sección `<!-- 5. ITINERARIO -->`). Si para XV el itinerario es idéntico entre teen y adulto, copiar y pegar.

6. Cargar las fotos de la galería en `CONFIG.gallery` (en `app.js`). Si queda vacía, la sección entera se oculta:
   ```js
   gallery: [
     { src: 'fotos/01.jpg', alt: 'Descripción opcional' },
     { src: 'fotos/02.jpg', alt: '' },
   ],
   ```

7. Actualizar los meta tags Open Graph en cada HTML que se vaya a deployar (`og:title`, `og:description`, `og:image`). Para XV, `adulto.html` y `teen.html` apuntan a `preview-adulto.png` y `preview-teen.png` respectivamente — pueden tener título/descripción distintos para que el preview en WhatsApp ya indique si es la invitación adulto o teen.

8. El ícono de pestaña ya está incluido (`favicon-32.png` y `favicon-180.png`). Son el logo de Momentum y no requieren cambios.

---

## Paso 3 — Diseño del tema

1. Completar `BRIEF.md` con los datos del cliente.

2. Abrir un chat con la IA y enviar:
   > Aplicá el siguiente brief a `theme.css`. No toques ningún otro archivo.
   > [adjuntar BRIEF.md y theme.css]

3. Reemplazar `theme.css` con la respuesta. Verificar en el navegador y pedir ajustes si hace falta.

4. **Generar las imágenes de preview** (og:image) para WhatsApp/redes:

   ```bash
   npm run preview
   ```

   Esto produce hasta cinco PNG de 1200×630 en la raíz del proyecto (uno por cada HTML existente):
   - `preview.png` — hero de la invitación de casamiento (`index.html`).
   - `preview-adulto.png` — hero de la invitación XV adulto (`adulto.html`).
   - `preview-teen.png` — hero de la invitación XV teen (`teen.html`).
   - `preview-std.png` — hero del save the date sin la fecha (el invitado solo la conoce al entrar).
   - `preview-d12.png` — hero de la invitación XV solo al baile post-medianoche.

   Para cada HTML que vayas a deployar, verificar que el `<meta property="og:image">` apunte al PNG correspondiente. Reejecutar el script cada vez que cambien `theme.css`, `styles.css` o el hero. Borrar los PNG de HTMLs que no vayas a deployar.

---

## Paso 4 — Configuración del webhook n8n + Google Sheets

Cada evento necesita su propia hoja. El formulario hace POST a un webhook de n8n hecho a medida, que appendea cada submission a la planilla del evento.

[Modo de uso - Planilla de Invitados Automatizada](https://docs.google.com/document/d/1RuafZKMS56R5spTZD_6qfCtGDNDznPuClcOmGO-WzLQ/edit?tab=t.0)

Una vez obtenida la URL del webhook de n8n, pegarla en `CONFIG.webhookUrl`.

---

## Paso 5 — Testing

### Tests automáticos (formulario)

Playwright levanta automáticamente un server estático en `localhost:5500` antes de correr. Si ya tenés Live Server abierto en ese puerto, lo reutiliza.

```bash
npm install        # solo la primera vez por proyecto
npm test
```

Cubren: visibilidad de restricciones alimentarias, validación de campos requeridos, todas las combinaciones de restricciones, manejo de errores de red.

### Verificación manual

Lo que los tests automáticos no cubren:

- [ ] La portada se cierra al hacer clic y arranca la música
- [ ] El botón de música pausa y reanuda correctamente
- [ ] La cuenta regresiva muestra valores correctos
- [ ] El botón "Cómo llegar" abre Google Maps
- [ ] Los datos del formulario llegan a Google Sheets
- [ ] Nombre, fecha, salón, dirección, CBU y alias son correctos
- [ ] El itinerario y el dress code son correctos
- [ ] Las fotos de galería cargan correctamente
- [ ] Se ve bien en celular (Chrome DevTools → modo móvil)
- [ ] Sin errores en la consola del navegador

---

## Paso 6 — Deploy

Cada invitación vive como una subcarpeta de `momentuminvitaciones.com` (Hostinger). La URL final tiene la forma `https://momentuminvitaciones.com/NombreEvento_DDMMAA/`.

1. Crear `.env` a partir de `.env.example` con los datos del hosting:
   ```
   DEPLOY_HOST=usuario@servidor.hostinger.com
   DEPLOY_PORT=22
   DEPLOY_PATH=/home/usuario/public_html/NombreEvento_DDMMAA/
   ```
   Credenciales SSH en Bitwarden → Hostinger. `.env` está gitignoreado.

2. Crear la carpeta destino en el hosting (vía SSH o FTP) si no existe. **Evitar nombres que choquen con slugs de WordPress** (el root del dominio corre un WP install). Nombres genéricos como `boda`, `xv`, `casamiento`, `invitacion` pueden colisionar — usar siempre el patrón `<Tipo>_<Nombre>_<DDMMAA>`.

3. Dry-run primero para ver qué se sube:
   ```bash
   npm run deploy
   ```
   El script usa `rsync` con `.deployignore` (excluye `node_modules/`, `tests/`, `.git/`, `BRIEF.md`, `PROCESO.md`, `CLAUDE.md`, `scripts/`, `package*.json`, etc.). Sube los HTML que dejaste en la carpeta (Paso 2.4), `app.js`, `styles.css`, `theme.css`, `.htaccess`, favicons, `music.mp3`, los previews que correspondan y la carpeta de fotos.

4. Ejecutar el deploy real:
   ```bash
   npm run deploy -- --go
   ```

5. Verificar que las URLs carguen en navegador y celular:
   - **XV**: `https://momentuminvitaciones.com/<carpeta>/adulto` y `/teen` (la raíz `/<carpeta>/` debe dar 404 porque no hay `index.html`). Opcionalmente `/despues-12`.
   - **Casamiento**: `https://momentuminvitaciones.com/<carpeta>/`.
   - **Save the date** (ambos casos): `https://momentuminvitaciones.com/<carpeta>/save-the-date`.

### Cache-busting al redeployar

El hosting tiene LiteSpeed Cache con expiraciones agresivas (CSS/JS 1 mes, imágenes 1 año). Si redeployás un fix después del primer envío al cliente, los invitados pueden ver la versión vieja por semanas.

**Convención**: las referencias en todos los HTML que se deployan (`index.html` / `adulto.html` / `teen.html` / `save-the-date.html` / `despues-12.html`) a CSS/JS y la `musicUrl` en `CONFIG` llevan un `?v=N`. Cada vez que redeployás con cambios, **bumpear ese número en TODOS los archivos afectados a la vez** (comparten assets). Los browsers tratan la nueva query string como un recurso nuevo y se saltean el cache.

Para imágenes (galería, preview, favicons): si reemplazás un archivo con el mismo nombre, agregar `?v=N` también en el `src` del HTML, o renombrar el archivo.

## Paso 7 — Entrega

- [ ] Probar la URL final (`https://momentuminvitaciones.com/<carpeta>/`) en un celular real
- [ ] Enviar la URL al cliente

---

## Save the date

Cada proyecto incluye un `save-the-date.html` que es una **versión recortada** de la invitación: solo portada (entry gate), botón de música y hero (kicker + nombre + fecha + countdown). Sin itinerario, dress code, galería, regalos ni formulario.

Comparte todos los assets (`app.js`, `styles.css`, `theme.css`, `music.mp3`, favicons) con la invitación completa: vive en la misma carpeta. No requiere mantener dos copias del tema.

**Personalización por evento:**

1. Editar las meta tags (`og:title`, `og:description`, `og:image`) — la imagen de preview puede ser distinta a la de la invitación completa.
2. El kicker dice "Save the date" por default. Cambiar el texto del `<span id="heroKickerStd">` si querés otra frase ("Reservá la fecha", etc.).
3. Nombre, fecha y countdown se completan automáticamente desde `CONFIG` en `app.js` (mismos `id` que la invitación completa).
4. La URL final es `https://momentuminvitaciones.com/<carpeta>/save-the-date` (sin `.html`) gracias al `.htaccess` del proyecto.

`app.js` funciona transparentemente en ambas páginas: las funciones de init que no encuentran su DOM (formulario, galería, dieta) hacen early return.

---

## Pendientes / mejoras

- **Analíticas de aperturas y RSVP**: hoy no hay forma de saber si los invitados abrieron el link, cuántos pasaron la portada o dónde abandonan el formulario. Evaluar Plausible (cloud o self-hosted), Umami self-hosted, o un pixel custom que pegue a la misma Google Sheet del RSVP. Es la métrica más obvia que falta.
- **Backup pre-deploy**: el deploy actual sobreescribe la carpeta del evento. Para invitaciones que ya circulan, considerar copiar `<carpeta>/` → `<carpeta>_bak_YYYYMMDD/` en el server antes de cada `npm run deploy -- --go`, así hay rollback en un comando.
- **DRY entre `adulto.html` y `teen.html`**: hoy son ~280 líneas casi idénticas (solo difieren `<title>`, 3 meta tags Open Graph y el id/texto del kicker). Si se edita el itinerario, el dress code o cualquier sección hay que tocar ambos archivos y es fácil olvidarse uno. Opciones evaluadas y descartadas por ahora: (a) PHP includes — requiere instalar PHP CLI local y cambiar dev servers a `php -S`; (b) build/sync script — `scripts/sync-variants.js` que regenere `teen.html` desde `adulto.html` aplicando string replacements, encadenado a `npm run preview` y `npm run deploy`. La opción (b) es la más viable cuando la duplicación empiece a doler. Disparador para retomar: cuando aparezca el primer bug por edición desincronizada o cuando los eventos XV se vuelvan más frecuentes.

---

## Variante teen vs adulto (XV años con doble tarjeta)

Desde la nueva estructura, ambas variantes se sirven desde **la misma carpeta** en URLs distintas:

- `https://momentuminvitaciones.com/<carpeta>/adulto` → `adulto.html`
- `https://momentuminvitaciones.com/<carpeta>/teen`   → `teen.html`

Cada HTML tiene su propio marker en el DOM (`#heroKickerAdulto` / `#heroKickerTeen`) que `app.js` detecta para:
- Sobrescribir el campo `teen_adulto` del payload del RSVP (`'adulto'` / `'teen'`), que la planilla del organizador usa para asignar el menú correcto.
- Permitir que el kicker del hero diga algo distinto en cada variante (texto hardcodeado en cada HTML, similar a `heroKickerStd` del save-the-date).

Además cada uno tiene sus propios meta tags Open Graph (`og:title`, `og:description`, `og:image`) → el preview en WhatsApp ya muestra si es la tarjeta adulto o teen.

**Recomendación**: aunque la app soporta usar solo una variante, lo natural en XV es deployar ambas. Si por algún motivo solo se usa una, basta con borrar el HTML de la otra antes del deploy.
