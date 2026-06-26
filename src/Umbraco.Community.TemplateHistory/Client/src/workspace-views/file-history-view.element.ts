import {
  LitElement,
  css,
  html,
  customElement,
  state,
  nothing,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import type { ManifestWorkspaceView, UmbWorkspaceViewElement } from "@umbraco-cms/backoffice/workspace";
import { UMB_NOTIFICATION_CONTEXT } from "@umbraco-cms/backoffice/notification";
import { UMB_TEMPLATE_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/template";
import { UMB_STYLESHEET_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/stylesheet";
import { UMB_SCRIPT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/script";
import { UMB_PARTIAL_VIEW_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/partial-view";
import {
  getFileDiff,
  getFileExtension,
  getAssetDisplayName,
  getFileVersions,
  restoreFileVersion,
  uniqueToServerPath,
  type AssetType,
  type FileVersion,
  type FileVersionDiff,
} from "../api/file-history-api.js";
import {
  buildSideBySideRows,
  buildUnifiedRows,
  CURRENT_VERSION_VALUE,
  parseUnifiedDiffText,
} from "./template-history-diff.utils.js";
import {
  layoutCodeEditor,
  setEditorVisible,
  type FileWorkspaceKind,
} from "./file-workspace-layout.js";

const VERSIONS_PAGE_SIZE = 10;
type DiffViewMode = "unified" | "sideBySide";

type FileHistoryManifestMeta = {
  assetType: AssetType;
  workspaceKind: FileWorkspaceKind;
};

@customElement("file-history-view")
export class FileHistoryViewElement extends UmbElementMixin(LitElement) implements UmbWorkspaceViewElement {
  manifest?: ManifestWorkspaceView;

  @state()
  private _assetKey?: string;

  @state()
  private _versions: FileVersion[] = [];

  @state()
  private _diff?: FileVersionDiff;

  @state()
  private _selectedVersionId?: string;

  @state()
  private _olderVersionId?: string;

  @state()
  private _newerVersionId: string = CURRENT_VERSION_VALUE;

  @state()
  private _diffViewMode: DiffViewMode = "sideBySide";

  @state()
  private _diffFullscreen = false;

  @state()
  private _visibleVersionCount = VERSIONS_PAGE_SIZE;

  @state()
  private _loading = false;

  @state()
  private _diffLoading = false;

  @state()
  private _error?: string;

  #notificationContext?: typeof UMB_NOTIFICATION_CONTEXT.TYPE;
  #assetType: AssetType = "Template";
  #workspaceKind: FileWorkspaceKind = "template";
  #contextInitialized = false;

  constructor() {
    super();

    this.consumeContext(UMB_NOTIFICATION_CONTEXT, (notificationContext) => {
      this.#notificationContext = notificationContext;
    });
  }

  #getManifestMeta(): FileHistoryManifestMeta {
    const meta = this.manifest?.meta as FileHistoryManifestMeta | undefined;
    return {
      assetType: meta?.assetType ?? "Template",
      workspaceKind: meta?.workspaceKind ?? "template",
    };
  }

  #observePathBasedAssetKey(
    workspaceContext: {
      unique?: import("rxjs").Observable<string | null>;
      getUnique?: () => string | null | undefined;
    } | null | undefined
  ) {
    const applyUnique = (unique: string | null | undefined) => {
      if (typeof unique !== "string" || !unique) {
        return;
      }

      const path = uniqueToServerPath(unique);
      if (path !== this._assetKey) {
        this._assetKey = path;
        this.#resetComparison();
        void this.#loadVersions();
      }
    };

    applyUnique(workspaceContext?.getUnique?.());

    this.observe(workspaceContext?.unique, applyUnique, "file-history-asset-key");
  }

  #observeAssetKey() {
    const { assetType } = this.#getManifestMeta();

    if (assetType === "Stylesheet") {
      this.consumeContext(UMB_STYLESHEET_WORKSPACE_CONTEXT, (workspaceContext) => {
        this.#observePathBasedAssetKey(workspaceContext);
      });
      return;
    }

    if (assetType === "Script") {
      this.consumeContext(UMB_SCRIPT_WORKSPACE_CONTEXT, (workspaceContext) => {
        this.#observePathBasedAssetKey(workspaceContext);
      });
      return;
    }

    if (assetType === "PartialView") {
      this.consumeContext(UMB_PARTIAL_VIEW_WORKSPACE_CONTEXT, (workspaceContext) => {
        this.#observePathBasedAssetKey(workspaceContext);
      });
      return;
    }

    this.consumeContext(UMB_TEMPLATE_WORKSPACE_CONTEXT, (workspaceContext) => {
      this.observe(
        workspaceContext?.alias,
        (alias) => {
          if (alias && alias !== this._assetKey) {
            this._assetKey = alias;
            this.#resetComparison();
            void this.#loadVersions();
          }
        },
        "file-history-asset-key"
      );
    });
  }

    connectedCallback() {
    const meta = this.#getManifestMeta();
    this.#assetType = meta.assetType;
    this.#workspaceKind = meta.workspaceKind;

    if (!this.#contextInitialized) {
      this.#observeAssetKey();
      this.#contextInitialized = true;
    }

    super.connectedCallback();
    setEditorVisible(this, false, this.#workspaceKind);
    requestAnimationFrame(() => setEditorVisible(this, false, this.#workspaceKind));

    if (this._assetKey) {
      void this.#loadVersions();
    }
  }

  disconnectedCallback() {
    this.#contextInitialized = false;
    setEditorVisible(this, true, this.#workspaceKind);
    requestAnimationFrame(() => layoutCodeEditor(this, this.#workspaceKind));
    super.disconnectedCallback();
  }

  #resetComparison() {
    this._diff = undefined;
    this._selectedVersionId = undefined;
    this._olderVersionId = undefined;
    this._newerVersionId = CURRENT_VERSION_VALUE;
    this._diffFullscreen = false;
    this._visibleVersionCount = VERSIONS_PAGE_SIZE;
  }

  async #loadVersions() {
    const meta = this.#getManifestMeta();
    this.#assetType = meta.assetType;

    if (!this._assetKey) {
      return;
    }

    this._loading = true;
    this._error = undefined;

    const { data, error } = await getFileVersions(this.#assetType, this._assetKey);

    this._loading = false;

    if (error) {
      this._error = "Failed to load file history.";
      return;
    }

    this._versions = data ?? [];
    this._diff = undefined;
    this._selectedVersionId = undefined;
    this._olderVersionId = undefined;
    this._newerVersionId = CURRENT_VERSION_VALUE;
    this._visibleVersionCount = VERSIONS_PAGE_SIZE;
  }

  async #loadDiff(olderVersionId: string, newerVersionId?: string) {
    if (!this._assetKey) {
      return;
    }

    this._olderVersionId = olderVersionId;
    this._newerVersionId = newerVersionId ?? CURRENT_VERSION_VALUE;
    this._diffLoading = true;
    this._error = undefined;

    const toVersionId =
      newerVersionId && newerVersionId !== CURRENT_VERSION_VALUE ? newerVersionId : undefined;

    const { data, error } = await getFileDiff(
      this.#assetType,
      this._assetKey,
      olderVersionId,
      toVersionId
    );

    this._diffLoading = false;

    if (error) {
      this._error = "Failed to load diff.";
      return;
    }

    this._diff = data as FileVersionDiff | undefined;
  }

  async #loadDiffIfReady() {
    if (!this._olderVersionId) {
      return;
    }

    const newer =
      this._newerVersionId === CURRENT_VERSION_VALUE ? undefined : this._newerVersionId;

    await this.#loadDiff(this._olderVersionId, newer);
  }

  #selectVersion(versionId: string) {
    this._selectedVersionId = versionId;
  }

  #onVersionKeydown(event: KeyboardEvent, versionId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.#selectVersion(versionId);
    }
  }

  async #compareVersion(versionId: string) {
    this._selectedVersionId = versionId;
    await this.#loadDiff(versionId, CURRENT_VERSION_VALUE);
  }

  async #compareSelected() {
    if (!this._selectedVersionId) {
      return;
    }

    await this.#loadDiff(this._selectedVersionId, CURRENT_VERSION_VALUE);
  }

  #clearComparison() {
    this._diff = undefined;
    this._olderVersionId = undefined;
    this._newerVersionId = CURRENT_VERSION_VALUE;
    this._diffFullscreen = false;
  }

  #swapVersions() {
    if (!this._olderVersionId || this._newerVersionId === CURRENT_VERSION_VALUE) {
      return;
    }

    const previousOlder = this._olderVersionId;
    this._olderVersionId = this._newerVersionId;
    this._newerVersionId = previousOlder;

    void this.#loadDiffIfReady();
  }

  #onOlderVersionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this._olderVersionId = select.value || undefined;
    void this.#loadDiffIfReady();
  }

  #onNewerVersionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this._newerVersionId = select.value || CURRENT_VERSION_VALUE;
    void this.#loadDiffIfReady();
  }

  #toggleDiffViewMode(mode: DiffViewMode) {
    this._diffViewMode = mode;
  }

  #toggleDiffFullscreen() {
    this._diffFullscreen = !this._diffFullscreen;
  }

  #loadMoreVersions() {
    this._visibleVersionCount += VERSIONS_PAGE_SIZE;
  }

  async #restoreVersion(versionId: string, event: Event) {
    event.stopPropagation();

    if (!this._assetKey) {
      return;
    }

    const confirmed = confirm(
      "Restore this version? The current file content will be saved to history first."
    );

    if (!confirmed) {
      return;
    }

    this._loading = true;
    const { error } = await restoreFileVersion(this.#assetType, this._assetKey, versionId);
    this._loading = false;

    if (error) {
      this.#notificationContext?.peek("danger", {
        data: { headline: "Restore failed", message: "Could not restore template version." },
      });
      return;
    }

    this.#notificationContext?.peek("positive", {
      data: { headline: "Version restored", message: "Reload the editor to see changes." },
    });

    this.#clearComparison();
    await this.#loadVersions();
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

  #formatVersionOption(version: FileVersion) {
    return `${this.#formatDate(version.savedAt)} — ${version.savedByUserName ?? "Unknown user"}`;
  }

  #getVisibleVersions() {
    return this._versions.slice(0, this._visibleVersionCount);
  }

  #getDiffFileName() {
    if (!this._assetKey) {
      return `file${getFileExtension(this.#assetType)}`;
    }

    const displayName = getAssetDisplayName(this.#assetType, this._assetKey);
    if (displayName.includes(".")) {
      return displayName;
    }

    return `${displayName}${getFileExtension(this.#assetType)}`;
  }

  #isLatestVersion(version: FileVersion) {
    return this._versions[0]?.id === version.id;
  }

  #renderVersionRow(version: FileVersion) {
    const isSelected = version.id === this._selectedVersionId;
    const isComparing = version.id === this._olderVersionId && Boolean(this._diff);

    return html`
      <div
        class="version-row ${isSelected ? "selected" : ""} ${isComparing ? "comparing" : ""}"
        role="radio"
        tabindex="0"
        aria-checked=${isSelected}
        aria-label=${`Version from ${this.#formatDate(version.savedAt)}`}
        @click=${() => this.#selectVersion(version.id)}
        @keydown=${(event: KeyboardEvent) => this.#onVersionKeydown(event, version.id)}
      >
        <div class="version-row-main">
          <span class="version-radio" aria-hidden="true"></span>
          <div class="version-meta">
            <div class="version-meta-top">
              <span class="version-date">${this.#formatDate(version.savedAt)}</span>
              ${this.#isLatestVersion(version)
                ? html`<span class="badge badge-current">Latest</span>`
                : nothing}
            </div>
            <span class="version-user">by ${version.savedByUserName ?? "Unknown user"}</span>
            <span class="version-source">${this.#formatChangeSource(version.changeSource)}</span>
          </div>
        </div>
        <div class="version-actions">
          <uui-button
            class="action-compare"
            look="secondary"
            compact
            label="Compare this version"
            ?disabled=${this._diffLoading}
            @click=${(event: Event) => {
              event.stopPropagation();
              void this.#compareVersion(version.id);
            }}
          >
            <uui-icon name="icon-search"></uui-icon>
            Compare
          </uui-button>
          <uui-button
            class="action-restore"
            look="secondary"
            color="warning"
            compact
            label="Restore this version"
            ?disabled=${this._loading}
            @click=${(event: Event) => this.#restoreVersion(version.id, event)}
          >
            <uui-icon name="icon-undo"></uui-icon>
            Restore
          </uui-button>
        </div>
      </div>
    `;
  }

  #renderUnifiedDiff(diffText: string) {
    const lines = parseUnifiedDiffText(diffText);

    if (lines.length === 0) {
      return html`<p class="empty-diff">No differences between the selected versions.</p>`;
    }

    const rows = buildUnifiedRows(lines);

    return html`
      <div class="diff-scroll unified" role="region" aria-label="Unified diff">
        ${rows.map(
          (row) => html`
            <div class="diff-line ${row.type}">
              <span class="line-number">${row.lineNumber ?? ""}</span>
              <span class="marker">${row.type === "added" ? "+" : row.type === "removed" ? "-" : " "}</span>
              <span class="text">${row.content}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  #renderSideBySideDiff(diffText: string) {
    const lines = parseUnifiedDiffText(diffText);

    if (lines.length === 0) {
      return html`<p class="empty-diff">No differences between the selected versions.</p>`;
    }

    const rows = buildSideBySideRows(lines);

    return html`
      <div class="diff-scroll side-by-side" role="region" aria-label="Side by side diff">
        <div class="diff-pane diff-pane-left">
          ${rows.map(
            (row) => html`
              <div class="diff-line ${row.left?.type ?? "empty"}">
                <span class="line-number">${row.leftLineNumber ?? ""}</span>
                <span class="marker">${row.left?.type === "removed" ? "-" : " "}</span>
                <span class="text">${row.left?.content ?? ""}</span>
              </div>
            `
          )}
        </div>
        <div class="diff-pane diff-pane-right">
          ${rows.map(
            (row) => html`
              <div class="diff-line ${row.right?.type ?? "empty"}">
                <span class="line-number">${row.rightLineNumber ?? ""}</span>
                <span class="marker">${row.right?.type === "added" ? "+" : " "}</span>
                <span class="text">${row.right?.content ?? ""}</span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  #renderDiffViewer() {
    if (this._diffLoading) {
      return html`<div class="diff-empty"><uui-loader></uui-loader></div>`;
    }

    if (!this._diff) {
      return html`
        <div class="diff-empty">
          <uui-icon name="icon-search"></uui-icon>
          <p>Select versions above to see changes.</p>
        </div>
      `;
    }

    return html`
      <div class="diff-viewer ${this._diffFullscreen ? "fullscreen" : ""}">
        <div class="diff-toolbar">
          <span class="diff-filename">${this.#getDiffFileName()}</span>
          <div class="diff-toolbar-actions">
            <div class="view-toggle" role="group" aria-label="Diff view mode">
              <uui-button
                look="secondary"
                compact
                label="Side by side view"
                class="toggle-btn ${this._diffViewMode === "sideBySide" ? "active" : ""}"
                @click=${() => this.#toggleDiffViewMode("sideBySide")}
              >
                Side by side
              </uui-button>
              <uui-button
                look="secondary"
                compact
                label="Unified view"
                class="toggle-btn ${this._diffViewMode === "unified" ? "active" : ""}"
                @click=${() => this.#toggleDiffViewMode("unified")}
              >
                Unified
              </uui-button>
            </div>
            <uui-button
              look="secondary"
              compact
              label=${this._diffFullscreen ? "Exit fullscreen" : "Fullscreen diff"}
              @click=${this.#toggleDiffFullscreen}
            >
              <uui-icon name=${this._diffFullscreen ? "icon-exit-fullscreen" : "icon-fullscreen"}></uui-icon>
            </uui-button>
          </div>
        </div>
        <div class="diff-body">
          ${this._diffViewMode === "sideBySide"
            ? this.#renderSideBySideDiff(this._diff.diffText)
            : this.#renderUnifiedDiff(this._diff.diffText)}
        </div>
        <div class="diff-legend" aria-label="Diff legend">
          <span class="legend-item removed"><span class="swatch"></span> Removed</span>
          <span class="legend-item added"><span class="swatch"></span> Added</span>
        </div>
      </div>
    `;
  }

  #renderVersionSelectors() {
    const olderOptions = this._versions.map((version) => ({
      id: version.id,
      label: this.#formatVersionOption(version),
    }));

    const newerOptions = [
      { id: CURRENT_VERSION_VALUE, label: "Current template" },
      ...olderOptions,
    ];

    return html`
      <div class="version-selectors">
        <label class="selector-field">
          <span class="selector-label older">Older version</span>
          <select
            class="version-select"
            aria-label="Older version"
            .value=${this._olderVersionId ?? ""}
            @change=${this.#onOlderVersionChange}
          >
            <option value="" disabled ?selected=${!this._olderVersionId}>Select older version</option>
            ${olderOptions.map(
              (option) => html`
                <option value=${option.id} ?selected=${this._olderVersionId === option.id}>
                  ${option.label}
                </option>
              `
            )}
          </select>
        </label>

        <uui-button
          class="swap-btn"
          look="secondary"
          compact
          label="Swap older and newer versions"
          ?disabled=${!this._olderVersionId || this._newerVersionId === CURRENT_VERSION_VALUE}
          @click=${this.#swapVersions}
        >
          <uui-icon name="icon-shuffle"></uui-icon>
        </uui-button>

        <label class="selector-field">
          <span class="selector-label newer">Newer version</span>
          <select
            class="version-select"
            aria-label="Newer version"
            .value=${this._newerVersionId}
            @change=${this.#onNewerVersionChange}
          >
            ${newerOptions.map(
              (option) => html`
                <option value=${option.id} ?selected=${this._newerVersionId === option.id}>
                  ${option.label}
                </option>
              `
            )}
          </select>
        </label>
      </div>
    `;
  }

  render() {
    const visibleVersions = this.#getVisibleVersions();
    const hasMoreVersions = this._versions.length > this._visibleVersionCount;

    return html`
      <div class="history-workspace">
        <section class="panel panel-history" aria-labelledby="history-heading">
          <header class="panel-header">
            <div class="panel-header-text">
              <h2 id="history-heading">Version history</h2>
              <p>Saved versions of this file</p>
            </div>
            <uui-button
              look="secondary"
              label="Compare selected version with current template"
              ?disabled=${!this._selectedVersionId || this._diffLoading}
              @click=${this.#compareSelected}
            >
              <uui-icon name="icon-shuffle"></uui-icon>
              Compare selected
            </uui-button>
          </header>

          <div class="panel-body">
            ${this._loading
              ? html`<div class="panel-loader"><uui-loader></uui-loader></div>`
              : nothing}
            ${this._error ? html`<uui-alert type="danger">${this._error}</uui-alert>` : nothing}

            ${!this._loading && this._versions.length === 0
              ? html`
                  <div class="empty-state">
                    <uui-icon name="icon-time"></uui-icon>
                    <p>No saved versions yet.</p>
                    <span>Versions are captured each time you save this file.</span>
                  </div>
                `
              : nothing}

            ${this._versions.length > 0
              ? html`
                  <div class="version-list" role="radiogroup" aria-label="Template versions">
                    ${visibleVersions.map((version) => this.#renderVersionRow(version))}
                  </div>
                  ${hasMoreVersions
                    ? html`
                        <div class="load-more">
                          <uui-button
                            look="secondary"
                            label="Load more versions"
                            @click=${this.#loadMoreVersions}
                          >
                            <uui-icon name="icon-navigation-down"></uui-icon>
                            Load more
                          </uui-button>
                        </div>
                      `
                    : nothing}
                `
              : nothing}
          </div>
        </section>

        <section class="panel panel-comparison" aria-labelledby="comparison-heading">
          <header class="panel-header">
            <div class="panel-header-text">
              <h2 id="comparison-heading">Comparison</h2>
              <p>Select two versions to see changes</p>
            </div>
            <uui-button
              look="secondary"
              label="Clear comparison"
              ?disabled=${!this._diff && !this._olderVersionId}
              @click=${this.#clearComparison}
            >
              <uui-icon name="icon-close"></uui-icon>
              Clear comparison
            </uui-button>
          </header>

          <div class="panel-body">
            ${this.#renderVersionSelectors()}
            ${this._diff && !this._diffLoading
              ? html`
                  <div class="diff-summary">
                    <span class="summary-pill added">+${this._diff.linesAdded} added</span>
                    <span class="summary-pill removed">-${this._diff.linesRemoved} removed</span>
                  </div>
                `
              : nothing}
            ${this.#renderDiffViewer()}
          </div>
        </section>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        --th-bg: #f4f5f7;
        --th-card-bg: #ffffff;
        --th-border: #e2e5ec;
        --th-text: #1b264f;
        --th-text-muted: #6b7280;
        --th-accent: #3544b1;
        --th-accent-soft: #eef1ff;
        --th-added: #e8f7ef;
        --th-added-text: #1f7a4c;
        --th-removed: #fdeef0;
        --th-removed-text: #c0395b;
        --th-restore: #9a6b2f;
        --th-radius: 8px;
        --th-shadow: 0 1px 2px rgba(27, 38, 79, 0.06);

        display: block;
        width: 100%;
        box-sizing: border-box;
        background: var(--th-bg);
        padding: var(--uui-size-space-5);
        min-height: 100%;
      }

      .history-workspace {
        display: grid;
        grid-template-columns: minmax(280px, 38%) minmax(0, 1fr);
        gap: 20px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .panel {
        background: var(--th-card-bg);
        border: 1px solid var(--th-border);
        border-radius: var(--th-radius);
        box-shadow: var(--th-shadow);
        min-width: 0;
        display: flex;
        flex-direction: column;
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--uui-size-space-4);
        padding: 20px 20px 16px;
        border-bottom: 1px solid var(--th-border);
      }

      .panel-header-text h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--th-text);
      }

      .panel-header-text p {
        margin: 4px 0 0;
        color: var(--th-text-muted);
        font-size: var(--uui-type-small-size);
      }

      .panel-body {
        padding: 16px 20px 20px;
        min-width: 0;
      }

      .panel-loader,
      .diff-empty {
        display: grid;
        place-items: center;
        gap: var(--uui-size-space-3);
        padding: var(--uui-size-space-8) var(--uui-size-space-4);
        color: var(--th-text-muted);
        text-align: center;
      }

      .diff-empty p,
      .empty-state p {
        margin: 0;
        font-weight: 600;
        color: var(--th-text);
      }

      .empty-state {
        display: grid;
        justify-items: center;
        gap: var(--uui-size-space-2);
        padding: var(--uui-size-space-8) var(--uui-size-space-4);
        text-align: center;
        color: var(--th-text-muted);
      }

      .empty-state span {
        max-width: 24rem;
      }

      .version-list {
        display: grid;
        gap: 10px;
      }

      .version-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border: 1px solid var(--th-border);
        border-radius: var(--th-radius);
        background: var(--th-card-bg);
        cursor: pointer;
        transition:
          border-color 140ms ease,
          background-color 140ms ease,
          box-shadow 140ms ease;
      }

      .version-row:hover {
        border-color: #c9d0de;
        box-shadow: 0 1px 3px rgba(27, 38, 79, 0.05);
      }

      .version-row:focus-visible {
        outline: 2px solid var(--th-accent);
        outline-offset: 2px;
      }

      .version-row.selected,
      .version-row.comparing {
        border-color: var(--th-accent);
        background: var(--th-accent-soft);
        box-shadow: 0 0 0 1px var(--th-accent);
      }

      .version-row-main {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }

      .version-radio {
        width: 16px;
        height: 16px;
        border: 2px solid #b8bfd1;
        border-radius: 50%;
        margin-top: 3px;
        flex-shrink: 0;
        position: relative;
      }

      .version-row.selected .version-radio {
        border-color: var(--th-accent);
      }

      .version-row.selected .version-radio::after {
        content: "";
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: var(--th-accent);
      }

      .version-meta {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .version-meta-top {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .version-date {
        font-weight: 600;
        color: var(--th-text);
      }

      .version-user,
      .version-source {
        color: var(--th-text-muted);
        font-size: var(--uui-type-small-size);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.4;
      }

      .badge-current {
        background: var(--th-accent-soft);
        color: var(--th-accent);
      }

      .version-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
        flex-shrink: 0;
      }

      .action-restore {
        --uui-button-color: var(--th-restore);
      }

      .load-more {
        display: flex;
        justify-content: center;
        margin-top: 16px;
      }

      .version-selectors {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 12px;
        align-items: end;
        margin-bottom: 16px;
      }

      .selector-field {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .selector-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .selector-label.older {
        color: var(--th-added-text);
      }

      .selector-label.newer {
        color: var(--th-removed-text);
      }

      .version-select {
        width: 100%;
        min-height: 38px;
        padding: 8px 12px;
        border: 1px solid var(--th-border);
        border-radius: 6px;
        background: #fff;
        color: var(--th-text);
        font: inherit;
      }

      .version-select:focus-visible {
        outline: 2px solid var(--th-accent);
        outline-offset: 1px;
      }

      .swap-btn {
        margin-bottom: 2px;
      }

      .diff-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }

      .summary-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }

      .summary-pill.added {
        background: var(--th-added);
        color: var(--th-added-text);
      }

      .summary-pill.removed {
        background: var(--th-removed);
        color: var(--th-removed-text);
      }

      .diff-viewer {
        border: 1px solid var(--th-border);
        border-radius: var(--th-radius);
        overflow: hidden;
        background: #fafbfc;
      }

      .diff-viewer.fullscreen {
        position: fixed;
        inset: 24px;
        z-index: 10000;
        background: #fff;
        box-shadow: 0 12px 40px rgba(27, 38, 79, 0.18);
      }

      .diff-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid var(--th-border);
        background: #f7f8fb;
        position: sticky;
        top: 0;
        z-index: 1;
      }

      .diff-filename {
        font-weight: 600;
        color: var(--th-text);
        font-size: var(--uui-type-small-size);
      }

      .diff-toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .view-toggle {
        display: inline-flex;
        gap: 4px;
        padding: 2px;
        border: 1px solid var(--th-border);
        border-radius: 6px;
        background: #fff;
      }

      .toggle-btn.active {
        --uui-button-background-color: var(--th-accent-soft);
        --uui-button-color: var(--th-accent);
      }

      .diff-body {
        min-height: 280px;
        max-height: min(520px, 55vh);
      }

      .diff-viewer.fullscreen .diff-body {
        max-height: calc(100vh - 180px);
      }

      .diff-scroll {
        height: 100%;
        max-height: inherit;
        overflow: auto;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.55;
      }

      .diff-scroll.side-by-side {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-width: 0;
      }

      .diff-pane {
        min-width: 0;
        border-right: 1px solid var(--th-border);
      }

      .diff-pane-right {
        border-right: none;
      }

      .diff-line {
        display: grid;
        grid-template-columns: 2.5rem 1rem minmax(0, 1fr);
        gap: 8px;
        padding: 0 10px;
        white-space: pre;
        min-height: 1.55em;
      }

      .diff-line.empty {
        background: #fff;
      }

      .diff-line.context {
        background: #fff;
        color: #4b5563;
      }

      .diff-line.added {
        background: var(--th-added);
        color: var(--th-added-text);
      }

      .diff-line.removed {
        background: var(--th-removed);
        color: var(--th-removed-text);
      }

      .line-number {
        text-align: right;
        color: #9aa3b2;
        user-select: none;
      }

      .marker {
        user-select: none;
        font-weight: 700;
      }

      .text {
        overflow-x: auto;
      }

      .diff-legend {
        display: flex;
        gap: 16px;
        padding: 10px 14px;
        border-top: 1px solid var(--th-border);
        background: #fff;
        font-size: 12px;
        color: var(--th-text-muted);
      }

      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .legend-item .swatch {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid var(--th-border);
      }

      .legend-item.removed .swatch {
        background: var(--th-removed);
      }

      .legend-item.added .swatch {
        background: var(--th-added);
      }

      .empty-diff {
        margin: 0;
        padding: 24px;
        color: var(--th-text-muted);
        font-style: italic;
      }

      @media (max-width: 1100px) {
        .history-workspace {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
      }

      @media (max-width: 900px) {
        :host {
          padding: var(--uui-size-space-4);
        }

        .history-workspace {
          grid-template-columns: 1fr;
        }

        .panel-header {
          flex-direction: column;
          align-items: stretch;
        }

        .version-row {
          flex-direction: column;
          align-items: stretch;
        }

        .version-actions {
          justify-content: flex-start;
        }

        .version-selectors {
          grid-template-columns: 1fr;
        }

        .swap-btn {
          justify-self: start;
          margin-bottom: 0;
        }

        .diff-scroll.side-by-side {
          grid-template-columns: 1fr;
        }

        .diff-pane {
          border-right: none;
          border-bottom: 1px solid var(--th-border);
        }
      }
    `,
  ];
}

export default FileHistoryViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "file-history-view": FileHistoryViewElement;
    "template-history-view": FileHistoryViewElement;
  }
}
