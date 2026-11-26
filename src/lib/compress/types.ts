import type { ImageKind } from '../formats'
import type { ZipEntry } from '../zip/reader'

export type QualityMode = 'recommended' | 'high' | 'max' | 'custom'
export type OutputFormat = 'keep' | 'webp' | 'avif' | 'jpeg' | 'png'

export interface Settings {
  mode: QualityMode
  /** calidad fija (30 a 100) cuando el modo es personalizado */
  customQuality: number
  output: OutputFormat
  /** conserva exif y perfil de color en los jpg */
  keepMetadata: boolean
  /** lado largo máximo en píxeles; 0 deja el tamaño original */
  maxSide: number
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'recommended',
  customQuality: 85,
  output: 'keep',
  keepMetadata: false,
  maxSide: 0,
}

/** de dónde sale el archivo: suelto en disco o dentro de un zip */
export type Source =
  | { kind: 'file'; file: File }
  | { kind: 'zip'; file: File; entry: ZipEntry }

export interface JobRequest {
  id: string
  source: Source
  settings: Settings
  /** lo que se sabe del tipo al añadirlo; permite desviar los gif sin pasar por un worker */
  kind?: ImageKind | null
}

export type ErrorCode =
  | 'notImage'
  | 'tooBig'
  | 'pixels'
  | 'decode'
  | 'zip'
  | 'timeout'
  | 'cancelled'
  | 'unsupported'

/** avisos que acompañan a un resultado correcto */
export type ResultNote = 'alreadyOptimal' | 'converted' | 'noRecompress' | 'resized'

export type JobResult =
  | { id: string; ok: false; error: ErrorCode; detail?: string }
  | {
      id: string
      ok: true
      /** null cuando se conserva el original porque no se pudo reducir */
      bytes: ArrayBuffer | null
      inKind: ImageKind
      outKind: ImageKind
      width: number
      height: number
      originalSize: number
      outSize: number
      note?: ResultNote
      /** similitud medida contra el original, de 0 a 1, si se pudo calcular */
      score?: number
      /** calidad con la que quedó, cuando el códec la usa */
      quality?: number
    }

/** similitud mínima que se exige según el modo, medida con ssim por bloques */
export const TARGET_SCORE: Record<Exclude<QualityMode, 'custom'>, number> = {
  high: 0.96,
  recommended: 0.91,
  max: 0.88,
}
