import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../../../api-specs/notification-service.openapi.yaml',
  output: {
    path: './generated',
  },
  plugins: ['@hey-api/client-axios'],
});
