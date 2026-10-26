# Fran & Diana · Nuestro espacio

App compartida con Dashboard, calendario independiente y fichas editables de Diana y Fran. PWA móvil en HTML, CSS y JavaScript, publicada desde `main` en GitHub Pages.

## Entretenimiento · Mis Películas y Series

Biblioteca compartida con contadores dinámicos, búsqueda y filtros combinables (tipo, plataforma, año de visualización y orden). Lista de escritorio que se adapta a tarjetas en móvil, modo claro/oscuro/automático, copiar y exportar CSV. Las exportaciones incluyen las reproducciones de cada título y protegen contra fórmulas de hoja de cálculo.

Plex es una plataforma independiente de Netflix, disponible en filtros, formularios y exportaciones. `database/plex-platform.sql` amplía la lista permitida sin cambiar políticas de acceso ni registros anteriores. Los historiales personales se importan directamente en Supabase, no se publican en este repositorio ni se reimportan al abrir la app.

Se pueden añadir/editar títulos, estado, calificación, notas y múltiples visualizaciones. La eliminación pide confirmación y avisa que afecta ambos teléfonos. Se muestran solo dos fechas por título o reproducción: «Inicio» y «Finalizada», tomadas de la primera y última visualización guardada. El campo independiente de finalización no se muestra. A petición del propietario, el 26 de octubre de 2026 se marcaron los 82 títulos existentes como Terminada, sin modificar fechas ni recuperar registros eliminados. Los contadores se calculan de los registros actuales.

La apariencia predeterminada es Clara. Una migración local de una sola vez restaura la paleta clara en los teléfonos existentes; después se puede elegir Clara, Automática u Oscura. Los campos de fecha tienen reglas explícitas de anchura y tamaño mínimo para evitar desbordamientos del control nativo de iOS. La calificación ocupa una fila completa, sin competir con un tercer campo de fecha.

Tablas independientes `df_media_titles` y `df_media_views`, ambas con el mismo acceso privado y RLS del espacio existente. `database/media.sql` contiene el esquema; los datos personales del historial no se incluyen en los archivos públicos ni se reinsertan al abrir la app. `df_media_save` guarda título e historial en una sola transacción y controla versiones para impedir sobrescrituras entre teléfonos. La clave normalizada impide duplicados por acentos, puntuación o mayúsculas, manteniendo anime y acción real separados.

Carátulas por URL externa, sin subir archivos a Supabase. Cinemeta proporciona búsqueda de metadatos sin clave de pago; se puede elegir otra coincidencia desde Editar o pegar una URL HTTPS. La búsqueda comparte únicamente el nombre del título, nunca sus fechas ni credenciales. Las imágenes usan carga diferida y no se precachean en el service worker; su disponibilidad depende del proveedor externo.

## Uso

Abrir la dirección normal de la app, escribir el código compartido de cuatro números y elegir Fran o Diana. El dispositivo recuerda el perfil y el acceso. Los datos se guardan en Supabase y se consultan al abrir, al regresar a la app y periódicamente mientras está visible.

El nombre elegido es una preferencia local. El código se verifica en la función de servidor `fechas-access`; no está en el frontend ni en el repositorio. Hay un límite de cinco intentos incorrectos por origen de red en quince minutos, además de un límite global de protección. Tras verificarlo, se devuelve la capacidad privada existente y se conserva localmente. Los accesos ya guardados y los enlaces privados anteriores siguen funcionando.

Para instalar en iPhone: abrir en Safari, Compartir → Añadir a pantalla de inicio. Si iOS abre una instalación con almacenamiento separado, introducir el código compartido una sola vez en esa instalación. No se necesita correo ni contraseña ni pegar enlaces.

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

## Versión 1.1.0

- Cada recuerdo anual explica el año original en la agenda mensual y en su detalle únicamente cuando se consulta una repetición posterior. Los cumpleaños aclaran el año de nacimiento. Los registros originales no se modifican.
- Icono cinematográfico 3D creado con la fotografía y el diseño aprobados como referencias. PNG opacos de 180, 192 y 512 píxeles; los iconos en el contenido usan el mismo recurso que el manifest.
- `npm run build` crea una compilación inmutable con una huella de contenido. Cada cambio en un archivo de la app genera automáticamente un identificador nuevo, sin depender de recordar aumentar manualmente la versión.
- El Service Worker descarga primero la versión completa y verifica el HTML. La activación espera la conformidad de todas las ventanas; un formulario abierto o un guardado bloquea la activación. Las ventanas sin trabajo abierto que están en segundo plano permiten preparar la actualización y recargan al volver al primer plano.
- El HTML mantiene una ruta estable; los módulos, estilos e iconos usan rutas de versión. Perfil, acceso privado y datos locales se conservan. La navegación sin conexión usa una versión completa y solo se limpian cachés antiguas de esta app.
- iOS decide cuándo refrescar el icono de una PWA ya instalada: las rutas nuevas de manifest/apple-touch-icon ayudan, pero no garantizan que iOS cambie el icono inmediatamente. Las funciones y contenidos se actualizan sin reinstalar.

La foto original y el montaje de referencia no se publican en el repositorio. Solo se publican los iconos solicitados.
