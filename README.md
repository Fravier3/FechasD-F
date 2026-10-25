# Fran & Diana · Nuestro espacio

App compartida con Dashboard, calendario independiente y fichas editables de Diana y Fran. PWA móvil en HTML, CSS y JavaScript, publicada desde `main` en GitHub Pages.

## Uso

Abrir el enlace privado completo una vez y elegir Fran o Diana. El dispositivo recuerda el perfil y el acceso. Los datos se guardan en Supabase y se consultan al abrir, al regresar a la app y periódicamente mientras está visible.

El nombre elegido es una preferencia local, no una identidad verificada. Quien posea el enlace privado puede consultar y editar el espacio compartido. El enlace no se incluye en el repositorio público. Se puede compartir desde la app; en un teléfono pequeño, tocar el perfil y usar el botón para compartir acceso.

Para instalar en iPhone: abrir en Safari, Compartir → Añadir a pantalla de inicio. Si iOS abre una instalación con almacenamiento separado, pegar el enlace privado una sola vez en la pantalla inicial. No se necesita correo ni contraseña.

## Datos y acceso

- Proyecto existente de Supabase; tablas nuevas `df_events` y `df_details` con RLS.
- La clave publicable en `config.js` no concede acceso a los datos por sí sola.
- El enlace incorpora una capacidad aleatoria de 256 bits en su fragmento. La app la guarda localmente y la envía en `x-client-info` para que las políticas verifiquen su SHA-256.
- No hay claves privilegiadas, fichas personales ni datos iniciales en el código público.
- Las ediciones incluyen una versión para detectar cambios concurrentes; un conflicto mantiene el formulario abierto.
- Sin conexión, se permite consultar la última copia local; las escrituras requieren conexión para no perder cambios.
- Las actualizaciones conservan el perfil y el acceso; el service worker solo guarda archivos de esta app, nunca respuestas de Supabase.

## Calendario

Los rangos incluyen inicio y fin, incluso al cruzar años. Los aniversarios de una sola fecha pueden repetirse anualmente. Las fechas de nacimiento de las fichas se muestran como cumpleaños recurrentes. Los eventos creados desde el calendario pueden marcarse para aparecer también en Dashboard.

## Desarrollo

`npm run check` comprueba sintaxis. `npm test` comprueba rangos, aniversarios, fechas válidas y celdas del calendario. No se necesitan dependencias para ejecutar la app. El workflow de Pages publica únicamente los archivos de la app, sin pruebas ni SQL.
