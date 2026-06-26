export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Umbraco Community Template History Entrypoint",
    alias: "Umbraco.Community.TemplateHistory.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
