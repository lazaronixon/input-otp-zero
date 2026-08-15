import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  resolve: {
    alias: {
      "input-otp-zero": path.resolve(import.meta.dirname, "src/index.js"),
      src: path.resolve(import.meta.dirname, "src")
    }
  },
  test: {
    environment: "jsdom",
    include: [ "test/unit/**/*.test.js" ],
    exclude: [ "**/browser/**", "**/node_modules/**" ]
  }
})
