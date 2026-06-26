import { LitElement, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { layoutCodeEditor, setEditorVisible } from "./file-workspace-layout.js";

@customElement("partial-view-editor-workspace-view")
export class PartialViewEditorWorkspaceViewElement extends UmbElementMixin(LitElement) {
  connectedCallback() {
    super.connectedCallback();
    setEditorVisible(this, true, "partialView");
    requestAnimationFrame(() => {
      setEditorVisible(this, true, "partialView");
      layoutCodeEditor(this, "partialView");
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  static styles = [
    css`
      :host {
        display: none;
      }
    `,
  ];
}

export default PartialViewEditorWorkspaceViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "partial-view-editor-workspace-view": PartialViewEditorWorkspaceViewElement;
  }
}
