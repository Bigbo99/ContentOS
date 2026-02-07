/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PEXELS_API_KEY: string;
    readonly VITE_TOPHUB_TOKEN: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
