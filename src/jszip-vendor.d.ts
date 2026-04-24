declare module 'jszip' {
  export default class JSZip {
    file(name: string, data: Uint8Array): JSZip;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
  }
}
