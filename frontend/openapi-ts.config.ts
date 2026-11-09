import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../spec/generated/openapi.yaml',
  output: 'src/generated',
});
