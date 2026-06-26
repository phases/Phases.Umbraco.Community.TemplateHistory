const WORKSPACE_STYLE_ID = "file-history-workspace-style";

const BODY_LAYOUT_STYLE_ID = "file-history-body-layout-style";

const ROUTER_SLOT_STYLE_ID = "file-history-router-slot-style";

const EDITOR_LAYOUT_STYLE_ID = "file-history-editor-layout-style";



export type FileWorkspaceKind = "template" | "stylesheet" | "script" | "partialView";



type CodeEditorHost = HTMLElement & {

  editor?: {

    monacoEditor?: {

      layout: () => void;

    };

  };

};



type WorkspaceLayoutConfig = {

  workspaceSelector: string;

  editorBoxSelector: string | null;

  editorLayoutCss: string;

};



const LAYOUT_CONFIG: Record<FileWorkspaceKind, WorkspaceLayoutConfig> = {

  template: {

    workspaceSelector: "umb-template-workspace-editor",

    editorBoxSelector: "uui-box",

    editorLayoutCss: `

      umb-template-workspace-editor uui-box {

        min-height: 0 !important;

        flex: 1 1 auto;

        display: flex;

        flex-direction: column;

      }



      umb-template-workspace-editor umb-code-editor {

        flex: 1 1 auto;

        min-height: 0;

        --editor-height: 100%;

      }

    `,

  },

  script: {

    workspaceSelector: "umb-script-workspace-editor",

    editorBoxSelector: "uui-box",

    editorLayoutCss: `

      umb-script-workspace-editor uui-box {

        min-height: 0 !important;

        flex: 1 1 auto;

        display: flex;

        flex-direction: column;

      }



      umb-script-workspace-editor umb-code-editor {

        flex: 1 1 auto;

        min-height: 0;

        --editor-height: 100%;

      }

    `,

  },

  partialView: {

    workspaceSelector: "umb-partial-view-workspace-editor",

    editorBoxSelector: "uui-box",

    editorLayoutCss: `

      umb-partial-view-workspace-editor uui-box {

        min-height: 0 !important;

        flex: 1 1 auto;

        display: flex;

        flex-direction: column;

      }



      umb-partial-view-workspace-editor umb-code-editor {

        flex: 1 1 auto;

        min-height: 0;

        --editor-height: 100%;

      }

    `,

  },

  stylesheet: {

    workspaceSelector: "umb-stylesheet-workspace-editor",

    editorBoxSelector: null,

    editorLayoutCss: `

      umb-stylesheet-code-editor-workspace-view uui-box {

        min-height: 0 !important;

        flex: 1 1 auto;

        display: flex;

        flex-direction: column;

      }



      umb-stylesheet-code-editor-workspace-view umb-code-editor {

        flex: 1 1 auto;

        min-height: 0;

        --editor-height: 100%;

      }

    `,

  },

};



let resizeObserver: ResizeObserver | undefined;

let observedBox: Element | null = null;



export function findWorkspaceEditor(from: HTMLElement): HTMLElement | null {

  let node: Node | null = from;



  while (node) {

    if (node instanceof HTMLElement && node.localName === "umb-workspace-editor") {

      return node;

    }



    if (node.parentNode) {

      node = node.parentNode;

      continue;

    }



    if (node instanceof ShadowRoot) {

      node = node.host;

      continue;

    }



    break;

  }



  return null;

}



function findCodeEditor(workspaceEditor: HTMLElement, kind: FileWorkspaceKind): CodeEditorHost | null {

  const config = LAYOUT_CONFIG[kind];



  if (kind === "stylesheet") {

    return document.querySelector("umb-stylesheet-code-editor-workspace-view umb-code-editor");

  }



  const workspace = workspaceEditor.closest(config.workspaceSelector);

  return workspace?.querySelector("umb-code-editor") ?? null;

}



function findEditorBox(workspaceEditor: HTMLElement, kind: FileWorkspaceKind): HTMLElement | null {

  const config = LAYOUT_CONFIG[kind];



  if (!config.editorBoxSelector) {

    return document.querySelector("umb-stylesheet-code-editor-workspace-view uui-box");

  }



  const workspace = workspaceEditor.closest(config.workspaceSelector);

  return workspace?.querySelector(config.editorBoxSelector) ?? null;

}



export function layoutCodeEditor(from: HTMLElement, kind: FileWorkspaceKind): void {

  const workspaceEditor = findWorkspaceEditor(from);

  if (!workspaceEditor) {

    return;

  }



  const codeEditor = findCodeEditor(workspaceEditor, kind);

  const layout = () => codeEditor?.editor?.monacoEditor?.layout();



  layout();

  requestAnimationFrame(layout);

  window.setTimeout(layout, 50);

  window.setTimeout(layout, 250);

}



export function layoutTemplateCodeEditor(from: HTMLElement): void {

  layoutCodeEditor(from, "template");

}



function observeEditorBox(workspaceEditor: HTMLElement, visible: boolean, kind: FileWorkspaceKind): void {

  const box = findEditorBox(workspaceEditor, kind);



  if (!visible) {

    if (resizeObserver && observedBox) {

      resizeObserver.unobserve(observedBox);

      observedBox = null;

    }

    return;

  }



  if (!box) {

    return;

  }



  resizeObserver ??= new ResizeObserver(() => {

    layoutCodeEditor(workspaceEditor, kind);

  });



  if (observedBox !== box) {

    if (observedBox) {

      resizeObserver.unobserve(observedBox);

    }



    resizeObserver.observe(box);

    observedBox = box;

  }

}



function ensureEditorLayoutStyle(kind: FileWorkspaceKind): void {

  const styleId = `${EDITOR_LAYOUT_STYLE_ID}-${kind}`;

  if (document.getElementById(styleId)) {

    return;

  }



  const style = document.createElement("style");

  style.id = styleId;

  style.textContent = LAYOUT_CONFIG[kind].editorLayoutCss;

  document.head.appendChild(style);

}



function ensureWorkspaceShadowStyle(workspaceEditor: HTMLElement): void {

  const shadow = workspaceEditor.shadowRoot;

  if (!shadow || shadow.getElementById(WORKSPACE_STYLE_ID)) {

    return;

  }



  const style = document.createElement("style");

  style.id = WORKSPACE_STYLE_ID;

  style.textContent = `

    #router-slot {

      height: auto !important;

      min-height: 0 !important;

      flex: 0 0 auto !important;

      width: 100% !important;

    }

  `;

  shadow.appendChild(style);

}



function ensureRouterSlotStyle(workspaceEditor: HTMLElement): void {

  const routerSlot = workspaceEditor.shadowRoot?.querySelector("#router-slot");

  const shadow = routerSlot?.shadowRoot;

  if (!shadow || shadow.getElementById(ROUTER_SLOT_STYLE_ID)) {

    return;

  }



  const style = document.createElement("style");

  style.id = ROUTER_SLOT_STYLE_ID;

  style.textContent = `

    :host {

      height: auto !important;

      min-height: 0 !important;

      width: 100% !important;

    }



    router-slot {

      height: auto !important;

      min-height: 0 !important;

    }

  `;

  shadow.appendChild(style);

}



function ensureBodyLayoutStyle(

  workspaceEditor: HTMLElement,

  editorHidden: boolean,

  kind: FileWorkspaceKind

): void {

  const bodyLayout = workspaceEditor.shadowRoot?.querySelector("umb-body-layout");

  const shadow = bodyLayout?.shadowRoot;

  if (!shadow) {

    return;

  }



  let style = shadow.getElementById(BODY_LAYOUT_STYLE_ID) as HTMLStyleElement | null;

  if (!style) {

    style = document.createElement("style");

    style.id = BODY_LAYOUT_STYLE_ID;

    shadow.appendChild(style);

  }



  const hideEditorRule =

    kind === "stylesheet"

      ? ""

      : `

      #main > slot::slotted(uui-box) {

        display: ${editorHidden ? "none" : "revert"} !important;

      }

    `;



  style.textContent = editorHidden

    ? `

      #main {

        display: flex;

        flex-direction: column;

        align-items: stretch;

        align-content: flex-start;

        gap: 0;

      }

      ${hideEditorRule}

    `

    : `

      #main {

        display: flex;

        flex-direction: column;

        align-items: stretch;

        min-height: 0;

        flex: 1 1 auto;

        gap: 0;

      }



      #main > slot::slotted(umb-router-slot) {

        flex: 0 0 auto;

      }



      #main > slot::slotted(uui-box) {

        flex: 1 1 auto;

        min-height: 0;

        display: flex;

        flex-direction: column;

      }

    `;

}



export function setEditorVisible(from: HTMLElement, visible: boolean, kind: FileWorkspaceKind): void {

  const workspaceEditor = findWorkspaceEditor(from);

  if (!workspaceEditor) {

    return;

  }



  ensureEditorLayoutStyle(kind);

  ensureWorkspaceShadowStyle(workspaceEditor);

  ensureRouterSlotStyle(workspaceEditor);

  ensureBodyLayoutStyle(workspaceEditor, !visible, kind);

  observeEditorBox(workspaceEditor, visible, kind);



  if (visible) {

    workspaceEditor.removeAttribute("data-hide-file-editor");

    layoutCodeEditor(from, kind);

  } else {

    workspaceEditor.setAttribute("data-hide-file-editor", "");

  }

}



export function setTemplateEditorVisible(from: HTMLElement, visible: boolean): void {

  setEditorVisible(from, visible, "template");

}


