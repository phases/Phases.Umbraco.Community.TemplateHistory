import { client } from "./client.gen.js";

export type AssetType = "Template" | "Stylesheet" | "Script" | "PartialView";

export type FileVersion = {
  id: string;
  assetType: AssetType | number;
  assetKey: string;
  savedByUserId: number;
  savedByUserName?: string;
  savedAt: string;
  changeSource: "Backoffice" | "FileSystem" | number;
  contentHash: string;
};

export type FileVersionDiff = {
  assetType: AssetType | number;
  assetKey: string;
  fromVersionId?: string;
  toVersionId?: string;
  diffText: string;
  linesAdded: number;
  linesRemoved: number;
};

/** @deprecated Use FileVersion */
export type TemplateVersion = FileVersion & { templateAlias?: string };

/** @deprecated Use FileVersionDiff */
export type TemplateVersionDiff = FileVersionDiff & { templateAlias?: string };

const apiBase = "/umbraco/umbracocommunitytemplatehistory/api/v1";
const security = [{ scheme: "bearer" as const, type: "http" as const }];
const MAGIC_DOT = "%dot%";

/** Converts Umbraco server-file unique to API asset path (e.g. /css/site.css). */
export function uniqueToServerPath(unique: string): string {
  const decoded = decodeURIComponent(unique);
  const path = decoded.replace(new RegExp(MAGIC_DOT, "g"), ".");
  return path.startsWith("/") ? path : `/${path}`;
}

function encodeAssetKey(assetType: AssetType, assetKey: string): string {
  if (assetType === "Template") {
    return encodeURIComponent(assetKey);
  }

  const normalized = assetKey.startsWith("/") ? assetKey.slice(1) : assetKey;
  return normalized.split("/").map(encodeURIComponent).join("/");
}

function getVersionsUrl(assetType: AssetType, assetKey: string): string {
  const encoded = encodeAssetKey(assetType, assetKey);

  switch (assetType) {
    case "Stylesheet":
      return `${apiBase}/stylesheets/versions/${encoded}`;
    case "Script":
      return `${apiBase}/scripts/versions/${encoded}`;
    case "PartialView":
      return `${apiBase}/partial-views/versions/${encoded}`;
    default:
      return `${apiBase}/templates/${encoded}/versions`;
  }
}

function getDiffUrl(assetType: AssetType, assetKey: string, fromVersionId: string, toVersionId?: string): string {
  const encoded = encodeAssetKey(assetType, assetKey);
  const query = toVersionId
    ? `?fromVersionId=${fromVersionId}&toVersionId=${toVersionId}`
    : `?fromVersionId=${fromVersionId}`;

  switch (assetType) {
    case "Stylesheet":
      return `${apiBase}/stylesheets/diff/${encoded}${query}`;
    case "Script":
      return `${apiBase}/scripts/diff/${encoded}${query}`;
    case "PartialView":
      return `${apiBase}/partial-views/diff/${encoded}${query}`;
    default:
      return `${apiBase}/templates/${encoded}/diff${query}`;
  }
}

function getRestoreUrl(assetType: AssetType, assetKey: string, versionId: string): string {
  const encoded = encodeAssetKey(assetType, assetKey);

  switch (assetType) {
    case "Stylesheet":
      return `${apiBase}/stylesheets/restore/${versionId}/${encoded}`;
    case "Script":
      return `${apiBase}/scripts/restore/${versionId}/${encoded}`;
    case "PartialView":
      return `${apiBase}/partial-views/restore/${versionId}/${encoded}`;
    default:
      return `${apiBase}/templates/${encoded}/restore/${versionId}`;
  }
}

export function getFileExtension(assetType: AssetType): string {
  switch (assetType) {
    case "Stylesheet":
      return ".css";
    case "Script":
      return ".js";
    case "PartialView":
      return ".cshtml";
    default:
      return ".cshtml";
  }
}

export function getAssetDisplayName(assetType: AssetType, assetKey: string): string {
  if (assetType === "Template") {
    return assetKey;
  }

  const segments = assetKey.split("/");
  return segments[segments.length - 1] || assetKey;
}

export async function getFileVersions(assetType: AssetType, assetKey: string) {
  return client.get<FileVersion[]>({
    security,
    url: getVersionsUrl(assetType, assetKey),
  });
}

export async function getFileDiff(
  assetType: AssetType,
  assetKey: string,
  fromVersionId: string,
  toVersionId?: string
) {
  return client.get<FileVersionDiff>({
    security,
    url: getDiffUrl(assetType, assetKey, fromVersionId, toVersionId),
  });
}

export async function restoreFileVersion(assetType: AssetType, assetKey: string, versionId: string) {
  return client.post({
    security,
    url: getRestoreUrl(assetType, assetKey, versionId),
  });
}

export async function getRecentFileVersions(take = 50) {
  return client.get<FileVersion[]>({
    security,
    url: `${apiBase}/recent?take=${take}`,
  });
}

// Backward-compatible template API aliases
export const getTemplateVersions = (alias: string) => getFileVersions("Template", alias);
export const getTemplateDiff = (alias: string, fromVersionId: string, toVersionId?: string) =>
  getFileDiff("Template", alias, fromVersionId, toVersionId);
export const restoreTemplateVersion = (alias: string, versionId: string) =>
  restoreFileVersion("Template", alias, versionId);
export const getRecentTemplateVersions = getRecentFileVersions;
