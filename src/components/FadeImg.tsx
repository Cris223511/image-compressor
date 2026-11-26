import { forwardRef, useCallback, useState, type ImgHTMLAttributes, type MutableRefObject } from 'react'

/** imagen que se funde al terminar de cargar, en lugar de aparecer de golpe */
export const FadeImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(function FadeImg(
  { className = '', onLoad, ...rest },
  ref,
) {
  const [ready, setReady] = useState(false)
  const set = useCallback(
    (node: HTMLImageElement | null) => {
      // si ya estaba en caché, el evento load pudo pasar antes de montarse
      if (node?.complete && node.naturalWidth > 0) setReady(true)
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as MutableRefObject<HTMLImageElement | null>).current = node
    },
    [ref],
  )
  return (
    <img
      ref={set}
      {...rest}
      className={`${className} transition-opacity duration-700 ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}
      onLoad={(e) => {
        setReady(true)
        onLoad?.(e)
      }}
    />
  )
})
