<p align="center">
  <img src="assets/logo/logo.png" alt="logo de Squeezo" width="120">
</p>

<h1 align="center">Squeezo</h1>

<p align="center">
  <b>Compresor de imágenes que reduce el peso sin perder calidad ni dimensiones.</b> Sube fotos sueltas,
  carpetas o un .zip entero, revisa qué contiene y descarga todo más liviano.
  <i>Todo ocurre en tu navegador: tus imágenes no se suben a ningún servidor.</i>
</p>

<p align="center">
  <a href="README.md">Español</a> · <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/Cris223511/image-compressor/releases/latest"><img src="https://img.shields.io/github/v/release/Cris223511/image-compressor?label=versi%C3%B3n&color=1861ff" alt="última versión"></a>
  <img src="https://img.shields.io/badge/React-18-1861ff" alt="react 18">
  <img src="https://img.shields.io/badge/TypeScript-5-1861ff" alt="typescript 5">
  <img src="https://img.shields.io/badge/Vite-5-1861ff" alt="vite 5">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-green" alt="licencia MIT"></a>
</p>

---

## Demo en vivo

Squeezo se usa **directamente en el navegador**, sin instalar nada ni crear una cuenta.

**[squeezo-six.vercel.app](https://squeezo-six.vercel.app)**

Ábrelo, suelta tus imágenes, carpetas o un .zip y descarga el resultado. Los cambios de cada versión están en el [historial de cambios](CHANGELOG.md).

## Cómo funciona

Arrastras tus imágenes, Squeezo las comprime y descargas el resultado. Por defecto no hay nada que configurar: el archivo pesa menos y se ve igual, con el mismo ancho, el mismo alto y la misma nitidez. Si prefieres decidir tú, hay ajustes opcionales.

Sirve para quien tiene una carpeta pesada de fotos, capturas o diseños y necesita enviarla, subirla a una web o liberar espacio sin que nada se note.

## Características

- **Mucho menos peso sin que se note.** Por defecto busca el menor peso cuya diferencia no se ve a simple vista, con las mismas dimensiones. Hay tres niveles: recomendado, calidad alta y máxima compresión. Si una imagen ya no se puede reducir, se deja tal cual y se avisa.
- **Los formatos de imagen de siempre.** JPG, PNG, WebP, AVIF, GIF (también animados), SVG y BMP. TIFF y HEIC se procesan en los navegadores que los saben leer.
- **Archivos .zip y carpetas.** Hasta 1000 imágenes por zip, con carpetas y subcarpetas. Antes de comprimir se muestra el contenido en un árbol, con miniaturas y el peso de cada archivo, para elegir qué entra.
- **Avisa de lo que no es imagen.** Videos y otros archivos del zip se omiten y se indica cuántos fueron y de qué tipo.
- **Ajustes opcionales.** Nivel de compresión, conversión a WebP, AVIF, JPG o PNG, conservar los metadatos y limitar el tamaño. Por defecto todo queda apagado.
- **Comparador antes y después** para comprobar el resultado imagen por imagen.
- **Descarga flexible.** Una por una o todo junto en un .zip con la misma estructura de carpetas.
- **Tu progreso no se pierde.** Si recargas, retrocedes o cierras la pestaña, sigues donde estabas, incluso a mitad de una compresión. Todo queda en tu navegador.
- **Español e inglés,** con tema claro y oscuro.

## Seguridad y privacidad

> **Tus imágenes se procesan por completo en tu equipo.** Nada se sube a ningún servidor. No hay cuentas, ni seguimiento, ni analítica. Lo único que se envía, al terminar una compresión, es la cantidad de imágenes reducidas, para el contador global de la página Nosotros.

Al ser un sitio abierto a cualquier archivo, se toman estas medidas:

- Se valida el contenido real de cada archivo (su firma binaria), no solo la extensión. Solo entran imágenes.
- Nada de lo que subes se ejecuta. Los archivos que no son imágenes se descartan.
- Los zips se revisan contra rutas maliciosas, relaciones de compresión sospechosas y archivos anidados o cifrados.
- Los SVG se limpian de scripts antes de procesarse.
- Se limita el tamaño en píxeles de cada imagen para que ninguna agote la memoria.
- Cabeceras de seguridad y política de contenido estricta, sin scripts de terceros.

## Tecnologías

| Componente | Herramienta | Para qué se usa |
| ---------- | ----------- | --------------- |
| Interfaz | [React 18](https://react.dev/) y [TypeScript 5](https://www.typescriptlang.org/) | La aplicación, con tipado estricto |
| Empaquetado | [Vite 5](https://vite.dev/) | Servidor de desarrollo y build de producción |
| Estilos | [Tailwind CSS](https://tailwindcss.com/) | El diseño y el tema claro u oscuro |
| Compresión | [jSquash](https://github.com/jamsinclair/jSquash) (MozJPEG, OxiPNG, WebP, AVIF), [SVGO](https://svgo.dev/) y [Gifsicle](https://www.lcdf.org/gifsicle/) | Los códecs, compilados a WebAssembly |
| Paralelismo | Web Workers | Comprimir varias imágenes a la vez sin congelar la página |
| Archivos zip | [fflate](https://github.com/101arrowz/fflate) | Leer y crear zips sin cargarlos enteros en memoria |
| Despliegue | [Vercel](https://vercel.com/) | Sitio estático con una función para el contador global (Upstash Redis) |

## Ejecutar en local

Hace falta **Node.js 18** o superior.

```
npm install
npm run dev
```

## Comandos

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Comprueba los tipos y genera la versión de producción en `dist`. |
| `npm run preview` | Sirve en local el resultado del build. |
| `npm test` | Corre los tests automáticos. |

## Cómo decide la calidad

Cada JPG, WebP o AVIF se codifica varias veces y se compara con el original midiendo la similitud por bloques (SSIM sobre luminancia y color). Se queda la versión más liviana que supera el umbral del nivel elegido, y el resultado final se verifica sobre la imagen completa. Los PNG con muchos colores se reducen a una paleta cuando no se nota, salvo en calidad alta, que no pierde ni un píxel. Si nada mejora el peso, el archivo original se conserva.

## Contribuir

Los reportes de errores y las ideas son bienvenidos en los [issues](https://github.com/Cris223511/image-compressor/issues). Para aportar código, abre un *pull request*.

## Licencia

**MIT** © [Cris223511](https://github.com/Cris223511). Puedes usarlo, modificarlo y compartirlo con libertad. El texto completo está en el archivo [LICENSE](LICENSE).
