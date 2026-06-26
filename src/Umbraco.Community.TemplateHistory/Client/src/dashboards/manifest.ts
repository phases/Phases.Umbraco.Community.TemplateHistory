export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Umbraco Community Template History Dashboard",
    alias: "Umbraco.Community.TemplateHistory.Dashboard",
    type: "dashboard",
    js: () => import("./template-history-dashboard.element.js"),
    meta: {
      label: "Template History",
      pathname: "template-history",
    },
    conditions: [
      {
        alias: "Umb.Condition.SectionAlias",
        match: "Umb.Section.Settings",
      },
    ],
  },
];
