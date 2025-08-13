declare module 'html-to-docx' {
  const htmlToDocx: (html: string, options?: any) => Promise<ArrayBuffer>;
  export default htmlToDocx;
}
