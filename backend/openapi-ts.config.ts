import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../spec/generated/openapi.yaml",
  output: { path: "src/generated", importFileExtension: ".ts" },
  plugins: ["@hey-api/typescript", "fastify"],
});
