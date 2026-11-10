// Navegador embutido em aplicativo: quem toca num link do Instagram, do Facebook ou do TikTok
// costuma abrir o site dentro do próprio app, sem a sessão do Google do celular.
const EMBEDDED = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|musical_ly|BytedanceWebview|TikTok|; wv\)/i;

export const isEmbeddedBrowser = (userAgent = globalThis.navigator?.userAgent) => EMBEDDED.test(String(userAgent || ''));
