/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // shadcn-style UI primitives (Button, Dialog, tabs.vue...) and route views use single-word names.
    'vue/multi-word-component-names': 'off',
    'vue/no-reserved-component-names': 'off'
  },
  overrides: [{ files: ['tailwind.config.js'], env: { node: true } }]
}
