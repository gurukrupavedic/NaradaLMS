declare module 'highlight.js/lib/languages/*' {
    type LanguageFn = any;
    const language: LanguageFn;
    export default language;
}
