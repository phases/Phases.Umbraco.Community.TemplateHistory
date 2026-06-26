import { UMB_WORKSPACE_CONDITION_ALIAS } from "@umbraco-cms/backoffice/workspace";
import { UMB_TEMPLATE_WORKSPACE_ALIAS } from "@umbraco-cms/backoffice/template";
import { UMB_STYLESHEET_WORKSPACE_ALIAS } from "@umbraco-cms/backoffice/stylesheet";
import { UMB_SCRIPT_WORKSPACE_ALIAS } from "@umbraco-cms/backoffice/script";
import { UMB_PARTIAL_VIEW_WORKSPACE_ALIAS } from "@umbraco-cms/backoffice/partial-view";
import type { AssetType } from "../api/file-history-api.js";
import type { FileWorkspaceKind } from "./file-workspace-layout.js";

type HistoryManifestMeta = {
  assetType: AssetType;
  workspaceKind: FileWorkspaceKind;
};

/** Higher weight = first tab = default. Umbraco Code tab uses 700 for stylesheets. */
const EDITOR_WORKSPACE_VIEW_WEIGHT = 700;
const HISTORY_WORKSPACE_VIEW_WEIGHT = 10;

function historyViewManifest(
  name: string,
  alias: string,
  workspaceAlias: string,
  meta: HistoryManifestMeta,
  weight: number
): UmbExtensionManifest {
  return {
    name,
    alias,
    type: "workspaceView",
    js: () => import("./file-history-view.element.js"),
    weight,
    meta: {
      label: "History",
      pathname: "history",
      icon: "icon-time",
      ...meta,
    },
    conditions: [
      {
        alias: UMB_WORKSPACE_CONDITION_ALIAS,
        match: workspaceAlias,
      },
    ],
  } as UmbExtensionManifest;
}

export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Umbraco Community Template Editor Workspace View",
    alias: "Umbraco.Community.TemplateHistory.EditorWorkspaceView",
    type: "workspaceView",
    js: () => import("./template-editor-workspace-view.element.js"),
    weight: EDITOR_WORKSPACE_VIEW_WEIGHT,
    meta: {
      label: "Template",
      pathname: "template",
      icon: "icon-code",
    },
    conditions: [
      {
        alias: UMB_WORKSPACE_CONDITION_ALIAS,
        match: UMB_TEMPLATE_WORKSPACE_ALIAS,
      },
    ],
  },
  historyViewManifest(
    "Umbraco Community Template History Workspace View",
    "Umbraco.Community.TemplateHistory.WorkspaceView",
    UMB_TEMPLATE_WORKSPACE_ALIAS,
    { assetType: "Template", workspaceKind: "template" },
    HISTORY_WORKSPACE_VIEW_WEIGHT
  ),
  {
    name: "Umbraco Community Script Editor Workspace View",
    alias: "Umbraco.Community.TemplateHistory.ScriptEditorWorkspaceView",
    type: "workspaceView",
    js: () => import("./script-editor-workspace-view.element.js"),
    weight: EDITOR_WORKSPACE_VIEW_WEIGHT,
    meta: {
      label: "Script",
      pathname: "script",
      icon: "icon-code",
    },
    conditions: [
      {
        alias: UMB_WORKSPACE_CONDITION_ALIAS,
        match: UMB_SCRIPT_WORKSPACE_ALIAS,
      },
    ],
  },
  historyViewManifest(
    "Umbraco Community Script History Workspace View",
    "Umbraco.Community.TemplateHistory.ScriptWorkspaceView",
    UMB_SCRIPT_WORKSPACE_ALIAS,
    { assetType: "Script", workspaceKind: "script" },
    HISTORY_WORKSPACE_VIEW_WEIGHT
  ),
  historyViewManifest(
    "Umbraco Community Stylesheet History Workspace View",
    "Umbraco.Community.TemplateHistory.StylesheetWorkspaceView",
    UMB_STYLESHEET_WORKSPACE_ALIAS,
    { assetType: "Stylesheet", workspaceKind: "stylesheet" },
    HISTORY_WORKSPACE_VIEW_WEIGHT
  ),
  {
    name: "Umbraco Community Partial View Editor Workspace View",
    alias: "Umbraco.Community.TemplateHistory.PartialViewEditorWorkspaceView",
    type: "workspaceView",
    js: () => import("./partial-view-editor-workspace-view.element.js"),
    weight: EDITOR_WORKSPACE_VIEW_WEIGHT,
    meta: {
      label: "Partial View",
      pathname: "partial-view",
      icon: "icon-code",
    },
    conditions: [
      {
        alias: UMB_WORKSPACE_CONDITION_ALIAS,
        match: UMB_PARTIAL_VIEW_WORKSPACE_ALIAS,
      },
    ],
  },
  historyViewManifest(
    "Umbraco Community Partial View History Workspace View",
    "Umbraco.Community.TemplateHistory.PartialViewWorkspaceView",
    UMB_PARTIAL_VIEW_WORKSPACE_ALIAS,
    { assetType: "PartialView", workspaceKind: "partialView" },
    HISTORY_WORKSPACE_VIEW_WEIGHT
  ),
];
