import { defaultPlugins, defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../spec/generated/openapi.yaml',
  output: 'src/generated',
  // msw: typed request handlers for tests, the app does not import them.
  plugins: [...defaultPlugins, 'msw'],
});
