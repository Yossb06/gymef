# GymE&F web

Versión web de GymE&F para iPhone, Android y computadora. Funciona como app instalada desde el navegador,
sin Xcode ni reinstalaciones semanales. Toda la familia entra con una sola cuenta y cada quien elige su perfil.

- Sin compilación ni Node: HTML + JavaScript (Preact/htm y supabase-js incluidos en `vendor/`).
- Local-first: los datos viven en el teléfono (IndexedDB) y se sincronizan con Supabase cuando hay conexión.
  En el gimnasio sin señal puedes seguir registrando series; se suben solas al recuperar conexión.
- Sin `config.js` configurado funciona en **modo local** (solo ese navegador), útil para probar.

## Puesta en marcha (una sola vez, ~15 min)

### 1. Crear la base de datos (Supabase, plan gratuito)
1. Crea una cuenta en https://supabase.com y un proyecto nuevo (región cercana, p. ej. `East US`). Guarda la contraseña de la base.
2. En el proyecto: **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. En **Project Settings → API** copia **Project URL** y la clave **anon public**, y ponlas en [`config.js`](config.js).
   La clave anon es pública por diseño; los datos los protegen el inicio de sesión y las reglas RLS del paso 2.

### 2. Publicar la web (Netlify, gratis)
1. Crea una cuenta en https://app.netlify.com.
2. Ve a **Sites → Add new site → Deploy manually** y arrastra la carpeta `web/` completa.
3. Netlify te da una dirección `https://….netlify.app` (puedes cambiar el nombre en *Site configuration*).
   Para publicar cambios, vuelve a arrastrar la carpeta en **Deploys**.

### 3. Crear la cuenta de la familia e importar los datos
1. Abre la dirección en la Mac → **Crear la cuenta de la familia** (correo + contraseña). Confirma el correo si Supabase lo pide.
2. Entra y elige **Importar respaldo** con `Exports/Backups/gymef-iphone-2026-11-02.gymbackup`
   (rescatado del iPhone el 2 de noviembre de 2026: 4 perfiles, rutina, 4 entrenamientos y 68 series).
3. En Supabase → **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**
   para que nadie más pueda crear cuentas.

### 4. Instalar en cada teléfono
- **iPhone (Safari):** abre la dirección → Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome):** menú ⋮ → *Instalar app*.

Cada persona inicia sesión con la cuenta de la familia y elige su perfil (Fran, Eve, Ayram, Papa Jose…).

## Publicar cambios

1. `python3 -I Scripts/release-web.py`: fija la versión (fecha + hash) y la lista de archivos que se guardan para usar sin conexión en `sw.js`.
2. Arrastrar la carpeta `web/` a Netlify → proyecto **gymef** → **Deploys** (recuadro punteado al final de la lista).
3. Los teléfonos descargan la versión nueva en segundo plano y muestran «Hay una versión nueva · Actualizar». La versión instalada se ve en **Más**.

## Pruebas

Con el servidor local abierto, http://localhost:8765/tests/ ejecuta las pruebas de reglas portadas de `GymEFTests`
(progresión, récords, 1RM, gráficas, volumen y tendencias).

## Probar en la Mac sin publicar

```sh
python3 -m http.server 8765 --directory web
```

y abrir http://localhost:8765 (con `config.js` vacío usa el modo local).

## Estructura

- `src/domain.js`: reglas portadas de la app iOS (unidades, progresión asistida, récords, tendencias, volumen).
- `src/data.js`: consultas y operaciones por perfil (rutinas, entrenamientos, historial, preferencias, cuerpo).
- `src/store.js`: almacenamiento local + cola de sincronización con Supabase (último cambio gana por registro).
- `src/backup.js`: respaldo `.gymbackup` V1, compatible con la app iOS en ambos sentidos.
- `src/screens/`: pantallas. `sw.js`: caché para abrir sin conexión.
- `../Scripts/store-to-backup.py`: convierte la base SwiftData del iPhone en un `.gymbackup`.
