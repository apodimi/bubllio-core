import react from "@vitejs/plugin-react";
import { buildEmailTheme } from "keycloakify-emails";
import { keycloakify } from "keycloakify/vite-plugin";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      themeName: "bubllio",
      accountThemeImplementation: "none",
      postBuild: async (buildContext) => {
        await buildEmailTheme({
          templatesSrcDirPath: path.join(
            buildContext.themeSrcDirPath,
            "email",
            "templates",
          ),
          filterTemplate: (filePath) => !filePath.endsWith("email-layout.ts"),
          themeNames: buildContext.themeNames,
          keycloakifyBuildDirPath: buildContext.keycloakifyBuildDirPath,
          locales: ["en", "el"],
          cwd: import.meta.dirname,
          environmentVariables: buildContext.environmentVariables,
        });
      },
    }),
  ],
});
