import { LitElement, css, customElement } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin } from "@umbraco-cms/backoffice/element-api";
import { layoutCodeEditor, setEditorVisible } from "./file-workspace-layout.js";

@customElement("template-editor-workspace-view")
export class TemplateEditorWorkspaceViewElement extends UmbElementMixin(LitElement) {
  connectedCallback() {
    super.connectedCallback();
    setEditorVisible(this, true, "template");
    requestAnimationFrame(() => {
      setEditorVisible(this, true, "template");
      layoutCodeEditor(this, "template");
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

export default TemplateEditorWorkspaceViewElement;

declare global {
  interface HTMLElementTagNameMap {
    "template-editor-workspace-view": TemplateEditorWorkspaceViewElement;
  }
}
