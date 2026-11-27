# Historial de cambios

Este documento recoge los cambios importantes de Squeezo, de la versión más reciente a la más antigua. Cada versión publicada tiene además su entrada en las [releases del repositorio](https://github.com/Cris223511/image-compressor/releases).

El formato sigue la convención de [Keep a Changelog](https://keepachangelog.com/es/) y el versionado es [semántico](https://semver.org/lang/es/). El primer número marca los cambios mayores, el segundo las funciones nuevas y el tercero las correcciones.

## 1.0.21 (2026-11-27)

- **El progreso nunca se pierde.** La sesión de trabajo, con los archivos añadidos y los resultados, se guarda siempre en el navegador, sin depender de las preferencias de cookies. Al recargar con F5, con Ctrl + R o con Ctrl + Mayús + R, o al cerrar y volver a abrir la pestaña, todo sigue donde estaba. Antes esa memoria solo funcionaba si se había aceptado de forma expresa, y quien rechazaba las cookies perdía el trabajo. El botón Vaciar y una ventana privada siguen siendo las formas de no dejar nada guardado.
- **Preferencias de cookies.** La página de cookies ya no incluye el interruptor de la sesión de trabajo, que pasa a la categoría de las necesarias, y los textos legales y las preguntas frecuentes lo reflejan.
- **Textos legales.** Cada punto de las listas de los términos, la privacidad y las cookies termina ahora con punto final.
- **Capturas del README.** Las tres imágenes de la documentación se vuelven a tomar con el aspecto actual del sitio.

## 1.0.20 (2026-11-27)

- **Un globo por elemento.** Cada botón muestra su propio globo de ayuda, que aparece al entrar el cursor y se desvanece por su cuenta al salir. Al pasar rápido por varios botones se ven varios globos a la vez, cada uno en una etapa distinta de su desvanecimiento, en lugar de un único globo que se desplaza de uno a otro.
- **Sin desplazamientos al aparecer.** El globo ya no cruza la pantalla desde una esquina la primera vez que se pasa el cursor, sino que aparece directamente sobre su botón.

## 1.0.19 (2026-11-27)

- **Globos de ayuda inmediatos.** El globo aparece en el mismo instante en que el cursor entra al elemento, sin la espera previa que tenía.

## 1.0.18 (2026-11-27)

- **Globos de ayuda propios.** Los botones y textos que mostraban el aviso gris del sistema ahora muestran un globo oscuro del propio sitio, que aparece por encima del elemento con un fundido suave. También aparece al enfocar con el teclado.
- **Comparador a pantalla completa.** El botón de expandir abre una vista grande con la comparación sobre un fondo hecho de la propia imagen desenfocada. Incluye zoom con la rueda, arrastre, doble clic y una barra con alejar, acercar, tamaño real, ajustar, descargar y cerrar. Se abre y se cierra con suavidad, y se cierra con la X, con Esc o con un clic en el fondo. El botón de ajustar a la ventana pasa a tener un icono propio.
- **Desplazamiento del índice.** Al pulsar un título del índice de los textos legales, la duración del deslizamiento crece con la distancia, de modo que los saltos largos no se sienten bruscos.

## 1.0.17 (2026-11-26)

- **Reordenar arrastrando.** Al arrastrar una imagen de la lista, la fila sigue al puntero y las demás se apartan con una animación para hacerle sitio, en lugar de mostrar una línea azul. Al soltar, la imagen se acomoda en su nueva posición también con animación.
- **Textos legales.** Los términos y condiciones, la política de privacidad y la de cookies suman más detalle en cada sección, sin secciones nuevas. Se resaltan en negrita las ideas principales y se eliminó el punto y coma de las listas.
- **Logotipo.** El nombre de la cabecera y del pie recupera sus proporciones normales, sin el estrechamiento que lo hacía ver alto y aplastado.

## 1.0.16 (2026-11-26)

- **Orden por fecha de modificación.** Al añadir archivos, carpetas o zips, las imágenes se colocan de la más antigua a la más reciente según su fecha de modificación, y no en el orden que entregue el explorador de archivos. Cada tanda que se añade después se ordena igual y queda al final. Los archivos sin fecha van al final, y los que comparten fecha conservan su orden de llegada. Ese orden es el que se usa al comprimir y al descargar el zip, y se puede cambiar arrastrando las imágenes.

## 1.0.15 (2026-11-26)

- **Descarga de una sola imagen.** Cuando el resultado es una única imagen, el botón principal dice «Descargar» y baja directamente esa imagen, sin crear un zip. Con varias imágenes sigue diciendo «Descargar todo (.zip)».
- **Acciones de cada fila.** Los botones de comparar, descargar y eliminar se ven siempre, sin esperar a pasar el cursor, y quedan juntos y a la misma distancia.
- **Eliminar sin confirmación.** Al pulsar el botón de eliminar, la imagen o la carpeta se quita de inmediato.

## 1.0.14 (2026-11-26)

- **Preguntas frecuentes.** El título de la sección aparece centrado, alineado con las preguntas que tiene debajo.

## 1.0.13 (2026-11-26)

- **Comparador con zoom.** La rueda del ratón acerca y aleja la imagen sobre el punto donde está el cursor, y al acercar se arrastra con el ratón para recorrerla. Un doble clic acerca y otro vuelve a ajustar la imagen. Además hay botones para acercar, alejar y ajustar, un porcentaje respecto al tamaño real, donde 100 % es un píxel por píxel, y atajos de teclado con las teclas más, menos y cero. El deslizador de antes y después se sigue moviendo con su manija, también con zoom.
- **Diálogos más suaves.** El comparador, los ajustes y el aviso de soltar archivos se abren y se cierran de forma gradual. El desenfoque del fondo se animaba de golpe porque no se funde con la opacidad, y ahora se anima por separado. El comparador además reserva su tamaño final desde el principio, para que no crezca bruscamente al terminar de cargar la imagen.
- **Subrayado de los títulos.** Queda un solo trazo grueso azul, sin el trazo fino de detrás.

## 1.0.12 (2026-11-26)

- **Índice de las páginas legales.** Al hacer clic en una sección, el resaltado pasa a esa sección y no a la anterior, y la página se desliza con suavidad hasta ella. El resaltado sigue ahora la posición real de la lectura.
- **Desplazamiento suave.** Los desplazamientos animados, como los del índice, los enlaces con ancla y el botón de volver arriba, terminaban de golpe porque el reloj de la biblioteca no se reiniciaba al despertar. Ahora se deslizan de forma gradual y con un arranque y un frenado suaves.
- **Enlaces con ancla.** Desde el pie de página, las secciones de Nosotros se alcanzan una vez que la página terminó de acomodarse, y la sección queda siempre a la misma distancia de la cabecera.
- **Índice sin barra de desplazamiento.** Es más compacto y solo muestra su propia barra cuando la pantalla es demasiado baja para que quepa entero.

## 1.0.11 (2026-11-26)

- **Aviso de cookies.** Es más ancho, con el mismo ancho que el contenido de la web, y más bajo, de modo que el texto ocupa dos líneas en pantallas grandes.
- **Pie de página.** Se quita el botón «Comprimir imágenes» de la primera columna, ya que el mismo enlace sigue en la columna Producto.

## 1.0.10 (2026-11-26)

- **Accesibilidad.** Una auditoría con axe-core sobre todas las páginas, en modo claro y oscuro, y sobre el aviso de cookies y el panel de ajustes termina sin problemas. Se corrige el contraste del azul sobre fondo azul claro, el atenuado de los pasos inactivos del recorrido de calidad, el orden de los encabezados, el encabezado principal de la lista y el rol de los contadores animados.
- **Teclado.** Las imágenes de la lista se pueden reordenar con las flechas arriba y abajo desde el asa de puntos.
- **Pruebas.** Se añaden 13 pruebas para el consentimiento de cookies, el contador, eliminar imágenes y reordenarlas. Ahora son 60.
- **Navegadores.** La compresión completa, con JPG, PNG, GIF y SVG, el worker auxiliar de los PNG, el aviso de cookies y el reordenar con teclado se verifican también en Firefox, con los mismos resultados que en Chromium salvo diferencias de un 1 a un 2 % en algunos PNG por el decodificador de cada navegador.
- **Rendimiento.** Se mide el hilo principal durante la compresión de 24 imágenes y no aparece ningún bloqueo de más de 50 ms.

## 1.0.9 (2026-11-26)

- **Vista previa al compartir.** Al pegar el enlace en redes sociales o aplicaciones de mensajería aparece una tarjeta con el título, la descripción y una imagen propia. Cada página declara además su dirección canónica.
- **Buscadores.** Se añaden `robots.txt` y `sitemap.xml`.
- **Integración continua.** Cada cambio que se sube comprueba los tipos, ejecuta las pruebas y compila el proyecto.
- **README.** Incluye capturas de la aplicación y describe la lista editable, las preferencias de cookies y la insignia de la integración continua.
- **Revisión de código.** Se corrigen varios problemas detectados. El presupuesto de memoria ahora usa el tamaño real de cada imagen antes de empezar a procesarla, el worker auxiliar de los PNG ya no puede dejar una imagen colgada si falla, y una paleta que falla no impide entregar la versión sin pérdida. El guardado de la sesión no puede dejar un resultado antiguo tras repetir la compresión ni borrarse al activar y desactivar el permiso con rapidez. Un almacenamiento bloqueado no rompe los ajustes, un origen no válido recibe un 403 en el contador, cada imagen se suma una sola vez al contador global y el arrastre se libera si la lista desaparece.

## 1.0.8 (2026-11-26)

- **Títulos de Nosotros.** La palabra clave de cada título se resalta con el color primario, y en el título de la página, «Squeezo» va en azul. En los subtítulos de sección la palabra clave se subraya además con un trazo de pincel que se dibuja de izquierda a derecha cuando el título entra en pantalla.
- **Recorrido de calidad.** Ya no se detiene al pasar el cursor por encima, y hay más espacio entre el título y la lista de pasos.

## 1.0.7 (2026-11-26)

- **Cookies y almacenamiento.** Un aviso sube desde la parte inferior en la primera visita, con los botones Aceptar, Rechazar y Personalizar preferencias. Lo único que siempre se guarda es el idioma, el tema y la decisión tomada. Los ajustes de compresión, la sesión de trabajo y el envío al contador global solo se activan con permiso, y al retirar un permiso se borran los datos que dependían de él.
- **Política de cookies.** Nueva página con los interruptores de cada permiso y el detalle de lo que se guarda, para qué sirve y cuánto tiempo permanece. Tiene enlace en el pie de página, y la privacidad, los términos y las preguntas frecuentes se actualizan en consecuencia.
- **Tema claro por defecto.** La web se abre siempre en modo claro, sin tomar el del sistema, y recuerda el modo oscuro cuando se elige.
- **Compresión más rápida.** Se aprovechan hasta 8 núcleos en lugar de 4, los PNG ejecutan en paralelo sus dos optimizaciones y los codificadores se cargan mientras se revisa la lista. En una tanda de 24 imágenes el tiempo baja de unos 20 a unos 12 segundos, y un PNG suelto pasa de 7,3 a 4,4 segundos, con exactamente los mismos pesos de resultado.
- **Desplazamiento.** La rueda del ratón desplaza el índice lateral de las páginas legales, y todas las barras de desplazamiento adoptan el azul de la marca.
- **Código.** Los comentarios se reescriben con un estilo más natural y directo.

## 1.0.6 (2026-11-26)

- **Términos y condiciones.** Pasan de 12 a 19 secciones, con listas, subtítulos y una lista numerada. Se añaden requisitos de uso, niveles de compresión, descarga de los resultados, medidas de seguridad, contador global, código abierto y contribuciones, y divisibilidad e interpretación.
- **Política de privacidad.** Pasa de 9 a 16 secciones. Se añaden el detalle de los datos que intervienen, cómo eliminar los datos guardados, el contador global, las cookies, la conservación de los datos, los derechos del usuario y los menores de edad.
- **Eliminar de la lista.** Cada imagen y cada carpeta tienen al final un botón para eliminarla, que pide confirmación en la misma fila y se cancela con la equis, con Escape o pasados unos segundos.
- **Reordenar.** Cada imagen tiene al inicio un asa de seis puntos para arrastrarla a otra posición de su misma carpeta. El nuevo orden se aplica al procesar y al descargar el zip, y se conserva al recargar. Mientras se comprime, el asa se desactiva.
- **Pie de página.** Se quita la línea azul y el degradado superior, y los enlaces ya no se parten en dos líneas.
- **Formato.** Las páginas legales admiten párrafos, subtítulos, listas con viñetas y listas numeradas, y el índice lateral tiene desplazamiento propio cuando no cabe en pantalla.

## 1.0.5 (2026-11-26)

- **Preguntas frecuentes.** Las preguntas se muestran de inmediato, sin animación de entrada. Las transiciones al abrir y cerrar cada respuesta se mantienen.

## 1.0.4 (2026-11-26)

- **Contador global.** La cifra de la página Nosotros pasa a ser el total de imágenes comprimidas por todas las personas que usan Squeezo, y se llama «imágenes comprimidas». Al terminar una compresión el navegador envía solo la cantidad de imágenes reducidas. Se limita a 20 envíos por minuto desde una misma dirección, y esta solo se conserva como una huella abreviada durante ese minuto.
- **Documentación.** La política de privacidad, las preguntas frecuentes y los README describen el contador.

## 1.0.3 (2026-11-26)

- **Términos y condiciones ampliados.** Pasan de siete a doce secciones: aceptación, descripción del servicio, uso permitido, archivos del usuario, almacenamiento en el navegador, calidad de los resultados, límites técnicos, disponibilidad, exclusión de garantías y responsabilidad, propiedad intelectual y licencia, servicios de terceros y modificación de los términos.
- **Política de privacidad ampliada.** Pasa de seis a nueve secciones y detalla el almacenamiento en el navegador, los datos personales, los metadatos de las imágenes, el alojamiento y los recursos de terceros.
- **Páginas legales sin animaciones de entrada.** Al ser textos de lectura, se muestran de inmediato, sin transiciones.
- **Zona de suelta.** El aviso de soltar archivos ya no aparece al arrastrar una imagen de la propia página, ni en las vistas distintas de la principal.
- **Estadísticas.** Se elimina el contador local de imágenes comprimidas en el navegador, que solo reflejaba el uso de cada persona.
- **Recorrido de calidad.** Comienza cuando la sección está a la vista y avanza más despacio.
- **Preguntas frecuentes.** Las respuestas se despliegan sin desvanecerse.
- **Portada sin animación de entrada.** El título, el texto, los botones y las tarjetas de la portada se muestran de inmediato. Las transiciones de los botones, los menús y las ventanas se mantienen, y el resto de la aplicación conserva sus efectos de aparición.
- **Textos.** Se eliminan las repeticiones sobre el procesamiento local en el encabezado, el pie de página y la introducción de Nosotros.

## 1.0.2 (2026-11-26)

- **Textos en registro formal.** Se reescriben los textos de toda la aplicación, en español y en inglés, con un lenguaje formal y literal. La sección de seguridad pasa a llamarse simplemente "Seguridad", y las preguntas frecuentes se amplían de cinco a nueve, con respuestas completas.
- **Orden de procesamiento.** Los archivos se muestran y se procesan en el mismo orden en que se añaden, sin reordenarlos por nombre. Pueden comprimirse varios a la vez, pero sus resultados se confirman siempre en ese orden.
- **Orden y fechas originales en la descarga.** El zip descargado respeta el orden de entrada y conserva la fecha y la hora de modificación de cada archivo, tanto de los archivos sueltos como de los que vienen dentro de un zip.
- **Diseño del avance.** La lista de archivos es más baja y el botón de comprimir queda debajo, sin flotar. El indicador de avance ocupa ese mismo lugar y muestra el estado, el progreso y el porcentaje.
- **Menor uso de la tarjeta gráfica.** El desplazamiento suave solo redibuja la página mientras hay desplazamiento.
- **Recorrido de calidad.** El recorrido de la página Nosotros siempre parte del primer paso, y hay más separación entre las secciones.

## 1.0.1 (2026-11-26)

- **Entradas suaves de arriba hacia abajo.** Los bloques de cada página caen en cascada, uno tras otro, y la aplicación aparece con un fundido cuando las tipografías ya están listas, sin cambios de letra a mitad de camino.
- **Hover suave en todo.** Ningún cambio al pasar el cursor dura menos de 300 ms, en botones, enlaces, tarjetas y filas.
- **Scroll suave con Lenis,** moderado, que respeta las listas con desplazamiento propio y los enlaces a secciones.
- **Transiciones en lo que se abre y se cierra.** Las preguntas frecuentes, las pestañas de la demostración, los avisos, el resumen de resultados, el selector de calidad personalizada y los omitidos se abren y se cierran deslizando. Las casillas, las miniaturas y los estados de cada imagen cambian con un fundido, igual que los diálogos, que además desenfocan el fondo.
- **Versión visible en el pie de página,** con enlace a las notas de esa versión.
- **Encabezado y pie quietos.** El marco del sitio no anima su entrada, y conserva solo los cambios suaves al pasar el cursor.
- **Página Nosotros renovada, con más aire entre secciones.** El recorrido de calidad avanza solo mientras se ve, se detiene al pasar el cursor y cada paso se puede tocar, sin atar el desplazamiento de la página. Se retira la sección ilustrada de privacidad y se reescriben con frases más claras los textos de Nosotros, Privacidad y Términos.
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
