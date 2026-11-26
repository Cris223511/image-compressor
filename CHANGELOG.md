# Historial de cambios

Este documento recoge los cambios importantes de Squeezo, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/image-compressor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

## 1.0.1 (2026-11-26)

- **Entradas suaves de arriba hacia abajo.** Los bloques de cada página caen en cascada, uno tras otro, y la aplicación aparece con un fundido cuando las tipografías ya están listas, sin cambios de letra a mitad de camino.
- **Hover suave en todo.** Ningún cambio al pasar el cursor dura menos de 300 ms, en botones, enlaces, tarjetas y filas.
- **Scroll suave con Lenis,** moderado, que respeta las listas con desplazamiento propio y los enlaces a secciones.
- **Transiciones en lo que se abre y se cierra.** Las preguntas frecuentes, las pestañas de la demostración, los avisos, el resumen de resultados, el selector de calidad personalizada y los omitidos se abren y se cierran deslizando. Las casillas, las miniaturas y los estados de cada imagen cambian con un fundido, igual que los diálogos, que además desenfocan el fondo.
- **Versión visible en el pie de página,** con enlace a las notas de esa versión.
- **Encabezado y pie quietos.** El marco del sitio no anima su entrada, y conserva solo los cambios suaves al pasar el cursor.
- **Página Nosotros renovada.** El recorrido de calidad avanza solo mientras se ve, se detiene al pasar el cursor y cada paso se puede tocar, sin atar el desplazamiento de la página. Se retira la sección ilustrada de privacidad y se reescriben con frases más claras los textos de Nosotros, Privacidad y Términos.
- **Movimiento reducido.** Con esa preferencia del sistema solo se detienen las repeticiones decorativas, y lo que está cerrado deja de recibir foco con el teclado.

## 1.0.0 (2026-11-26)

- **Compresión sin que se note.** Por defecto se busca el menor peso cuya diferencia no se ve a simple vista, con las mismas dimensiones. Hay tres niveles, recomendado, calidad alta y máxima compresión, y uno personalizado.
- **Formatos.** JPG, PNG, WebP, AVIF, GIF (también animados), SVG y BMP. Los PNG con muchos colores se reducen a una paleta cuando no se nota, y TIFF y HEIC se procesan en los navegadores que los saben leer.
- **Zips y carpetas.** Se leen sin descomprimirlos enteros y se muestran en un árbol con miniaturas y casillas. Lo que no es imagen, como videos, audios, documentos y ejecutables, se omite y se avisa. El límite es de 1000 imágenes por zip.
- **Resultados.** Se descarga una imagen suelta o todo en un zip con la misma estructura de carpetas, y un comparador de antes y después permite revisar cada imagen.
- **El progreso no se pierde.** Al recargar, retroceder o cerrar la pestaña, la sesión se recupera tal como estaba, incluso a mitad de una compresión.
- **Seguridad.** Se valida el contenido real de cada archivo, se descartan rutas peligrosas, entradas cifradas y bombas de descompresión, y los SVG se limpian de scripts. Los datos ocultos de los JPG y PNG, como la cámara y la ubicación, se eliminan salvo que se pida conservarlos.
- **Privacidad.** Todo ocurre en el navegador, sin cuentas, sin analítica y sin subir archivos.
- **Ajustes opcionales.** Conversión a WebP, AVIF, JPG o PNG, conservación de metadatos y límite de dimensiones.
- **Interfaz.** Español e inglés, tema claro y oscuro, adaptación a móvil y transiciones suaves en toda la aplicación. Incluye una página de presentación con demostraciones interactivas y preguntas frecuentes, además de términos y privacidad.
- **Pruebas automáticas.** Cubren el lector de zip, la detección de formatos, el árbol de carpetas, la medición de similitud y la limpieza de metadatos.

## 0.1.0 (2026-11-25)

- **Arranque del proyecto.** Se crea el repositorio con la licencia MIT, el logo, los README en español e inglés y la configuración de despliegue en Vercel con cabeceras de seguridad.
