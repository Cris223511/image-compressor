// límites de seguridad y de uso. están juntos para que sea fácil ajustarlos en un solo sitio.

/** imágenes que se aceptan por zip y en total por carga suelta */
export const MAX_IMAGES = 1000

/** megapíxeles máximos por imagen, para que una sola no agote la memoria del navegador */
export const MAX_PIXELS = 50_000_000

/** tope de lo que puede pesar un archivo ya descomprimido */
export const MAX_ENTRY_BYTES = 768 * 1024 * 1024

/** un archivo que se expande más que esto y pesa bastante se trata como zip bomba */
export const MAX_RATIO = 400
export const RATIO_MIN_BYTES = 64 * 1024 * 1024

/** entradas máximas que se leen del directorio de un zip */
export const MAX_ZIP_ENTRIES = 100_000

/** tiempo máximo que se le da a una imagen antes de darla por colgada */
export const JOB_TIMEOUT_MS = 5 * 60 * 1000

/** archivos omitidos que se recuerdan y se listan; el resto solo se cuenta por haberse pasado */
export const MAX_SKIPPED = 5000

/** una entrada de zip más pesada que esto no genera miniatura, para no inflarla en el hilo principal */
export const THUMB_MAX_BYTES = 32 * 1024 * 1024
