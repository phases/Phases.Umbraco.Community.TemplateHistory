import { LitElement, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { layoutCodeEditor, setEditorVisible } from "./file-workspace-layout.js";

@customElement("script-editor-workspace-view")
export class ScriptEditorWorkspaceViewElement extends UmbElementMixin(LitElement) {
  connectedCallback() {
    super.connectedCallback();
    setEditorVisible(this, true, "script");
    requestAnimationFrame(() => {
      setEditorVisible(this, true, "script");
      layoutCodeEditor(this, "script");
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

export default ScriptEditorWorkspaceViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "script-editor-workspace-view": ScriptEditorWorkspaceViewElement;
  }
}
