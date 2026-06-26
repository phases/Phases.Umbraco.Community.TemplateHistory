import {
  LitElement,
  css,
  html,
  customElement,
  state,
  nothing,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import {
  getAssetDisplayName,
  getRecentFileVersions,
  type AssetType,
  type FileVersion,
} from "../api/file-history-api.js";

@customElement("template-history-dashboard")
export class TemplateHistoryDashboardElement extends UmbElementMixin(LitElement) {
  @state()
  private _versions: FileVersion[] = [];

  @state()
  private _loading = false;

  @state()
  private _error?: string;

  connectedCallback() {
    super.connectedCallback();
    void this.#loadRecent();
  }

  async #loadRecent() {
    this._loading = true;
    this._error = undefined;

    const { data, error } = await getRecentFileVersions(50);

    this._loading = false;

    if (error) {
      this._error = "Failed to load recent file changes.";
      return;
    }

    this._versions = data ?? [];
  }

  #formatDate(value: string) {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  #formatChangeSource(source: FileVersion["changeSource"]) {
    if (source === "FileSystem" || source === 1) {
      return "File system";
    }

    return "Backoffice";
  }

  #resolveAssetType(assetType: FileVersion["assetType"]): AssetType {
    if (assetType === "Stylesheet" || assetType === 1) {
      return "Stylesheet";
    }

    if (assetType === "Script" || assetType === 2) {
      return "Script";
    }

    if (assetType === "PartialView" || assetType === 3) {
      return "PartialView";
    }

    return "Template";
  }

  #formatAssetType(assetType: FileVersion["assetType"]) {
    switch (this.#resolveAssetType(assetType)) {
      case "Stylesheet":
        return "Stylesheet";
      case "Script":
        return "Script";
      case "PartialView":
        return "Partial View";
      default:
        return "Template";
    }
  }

  #getAssetLabel(version: FileVersion) {
    const type = this.#resolveAssetType(version.assetType);
    return getAssetDisplayName(type, version.assetKey);
  }

  render() {
    return html`
      <uui-box headline="Recent file changes">
        <p class="intro">Latest template, partial view, stylesheet, and script saves tracked across the site.</p>

        ${this._loading ? html`<div class="panel-loader"><uui-loader></uui-loader></div>` : nothing}
        ${this._error ? html`<uui-alert type="danger">${this._error}</uui-alert>` : nothing}

        ${!this._loading && this._versions.length === 0
          ? html`
              <div class="empty-state">
                <uui-icon name="icon-time"></uui-icon>
                <p>No file versions recorded yet.</p>
              </div>
            `
          : nothing}

        ${this._versions.length > 0
          ? html`
              <div class="version-list">
                ${this._versions.map(
                  (version) => html`
                    <div class="version-row">
                      <div class="version-meta">
                        <span class="version-asset">${this.#getAssetLabel(version)}</span>
                        <span class="version-type">${this.#formatAssetType(version.assetType)}</span>
                        <span class="version-date">${this.#formatDate(version.savedAt)}</span>
                        <span class="version-user">${version.savedByUserName ?? "Unknown user"}</span>
                      </div>
                      <uui-tag look="secondary">${this.#formatChangeSource(version.changeSource)}</uui-tag>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
      </uui-box>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        padding: var(--uui-size-layout-1);
      }

      uui-box {
        --uui-box-default-padding: var(--uui-size-layout-1);
      }

      .intro {
        margin: 0 0 var(--uui-size-space-4);
        color: var(--uui-color-text-alt);
      }

      .panel-loader {
        display: grid;
        place-items: center;
        padding: var(--uui-size-space-6);
      }

      .empty-state {
        display: grid;
        justify-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-8);
        color: var(--uui-color-text-alt);
        text-align: center;
      }

      .empty-state p {
        margin: 0;
        font-weight: 600;
        color: var(--uui-color-text);
      }

      .version-list {
        display: grid;
        gap: var(--uui-size-space-3);
      }

      .version-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--uui-size-space-4);
        align-items: center;
        padding: var(--uui-size-space-4);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        background: var(--uui-color-surface);
      }

      .version-meta {
        display: grid;
        gap: var(--uui-size-space-1);
      }

      .version-asset {
        font-weight: 600;
      }

      .version-type,
      .version-date,
      .version-user {
        color: var(--uui-color-text-alt);
        font-size: var(--uui-type-small-size);
      }
    `,
  ];
}

export default TemplateHistoryDashboardElement;

declare global {
  interface HTMLElementTagNameMap {
    "template-history-dashboard": TemplateHistoryDashboardElement;
  }
}
