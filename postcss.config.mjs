/* ----------------------------------------------------------------------------
   postcss.config.mjs
   ----------------------------------------------------------------------------
   Tailwind 4 se ejecuta como plugin de PostCSS.
   - En Tailwind 3 se usaban dos plugins: 'tailwindcss' y 'autoprefixer'.
   - En Tailwind 4 se usa UN solo plugin: '@tailwindcss/postcss' que ya incluye
     el autoprefijado y todo lo necesario.
   ---------------------------------------------------------------------------- */
export default {
  plugins: {
    /* Procesa las directivas @import, @theme, @utility, etc. de Tailwind 4. */
    "@tailwindcss/postcss": {},
  },
};