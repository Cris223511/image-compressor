declare module 'gifsicle-wasm-browser' {
  interface RunOptions {
    input: { file: Blob | File | ArrayBuffer | string; name: string }[]
    command: string[]
  }
  const gifsicle: { run(options: RunOptions): Promise<File[]> }
  export default gifsicle
}
