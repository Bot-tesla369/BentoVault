# BentoVault

Personaliza la estética de Obsidian desde un solo sitio. La interfaz está en español.

## Cómo abrirlo
- **Panel rápido:** el icono de paleta 🎨 de la cinta izquierda, o `Ctrl+P` → «BentoVault: Abrir panel rápido».
- **Ajustes completos:** Ajustes → Complementos de la comunidad → **BentoVault**, o `Ctrl+P` → «BentoVault: Abrir ajustes completos».
- Otros comandos: «Alternar modo AMOLED», «Activar/desactivar estilos», «Aplicar la siguiente paleta». Puedes asignarles atajos en Ajustes → Atajos de teclado.

## Qué incluye
- Colores para el acento, H1–H6, el fondo principal y el secundario, la barra lateral, los bordes, el texto, los enlaces, el código, las citas y las etiquetas. Cada color tiene un selector, un campo hex y un botón para restablecerlo.
- 11 paletas predefinidas, entre ellas Tidepool Rojo, AMOLED Rojo, Carmesí, Neón cian y Papel (claro).
- **Modo AMOLED:** pone negro puro en los fondos, la barra lateral, el código y las citas.
- Tipografías de la interfaz, del texto y monoespaciada; tamaño del texto, interlineado, grosor de los títulos y tamaño de cada título.
- Radio de bordes y opacidades (texto atenuado, selección y fondo de las tarjetas).
- **Estilo bento:** muestra como tarjetas los callouts, las citas, las tablas, las notas incrustadas y el código (este último es opcional). Las tarjetas tienen radio, relleno, brillo con el color de acento y se elevan al pasar el ratón.
- **Rejilla bento:**
  ```markdown
  > [!bento|3]
  > > [!note|wide] Ancha
  > > Ocupa 2 columnas.
  >
  > > [!tip] Tarjeta
  > > Contenido.
  >
  > > [!info|tall] Alta
  > > Ocupa 2 filas.
  ```
  `[!bento]` reparte las columnas automáticamente; `[!bento|2]`, `[!bento|3]` y `[!bento|4]` fijan su número.
- **Presets:** puedes guardarlos, cargarlos, sobrescribirlos y eliminarlos. Al exportar, el JSON se guarda en `presets/` y se copia al portapapeles. Para importar, elige un archivo o pega el JSON. Hay un botón para restablecerlo todo, que conserva los presets.

## Cómo funciona
El plugin escribe variables CSS de Obsidian (`--background-primary`, `--interactive-accent`, `--accent-h/s/l`, `--h1-color`…) sobre `<body>`, con prioridad `!important` para imponerse al tema activo y al color de acento de Apariencia. Las reglas fijas para los títulos, los enlaces, las etiquetas y el código están en `styles.css`, porque temas como Blackbird los colorean sin usar variables. Al desactivar el plugin o el interruptor «Estilos activos», se restauran los valores anteriores.

Los campos de fuente vacíos respetan las fuentes que tengas configuradas en Apariencia.

## Datos y privacidad
- Los ajustes se guardan en `data.json` y los presets exportados en la carpeta `presets/` del plugin.
- Al exportar un preset, el JSON también se copia al portapapeles.

## Instalación manual
Copia `main.js`, `manifest.json` y `styles.css` en `<tu vault>/<carpeta de configuración>/plugins/bentovault/` y activa el plugin.

## Archivos
`manifest.json`, `main.js` (JS plano, sin compilación), `styles.css` y `versions.json`.

## Autoría
- **Autor:** Daniel
- **Coautores:** Claude (Anthropic) y ChatGPT (OpenAI)

## Licencia
[MIT](LICENSE)
