import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import "prosemirror-image-plugin/dist/styles/common.css";
import "prosemirror-image-plugin/dist/styles/withResize.css";
import "prosemirror-image-plugin/dist/styles/sideResize.css";
import {lintPlugin} from './lint'
import {searchReplacePlugin} from './findreplace'

// ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// )
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { DOMParser, Fragment, Node, NodeType } from "prosemirror-model"
import { exampleSetup } from "prosemirror-example-setup"
import { mySchema,initialDoc } from "./schema"
import {CodeBlockView,arrowHandlers} from "./codemirror"
import { defaultSettings, imagePlugin } from "prosemirror-image-plugin"
import { searchReplacePlugin2 } from './findreplace2';


let editor = document.querySelector("#editor")!
let content = document.querySelector("#content")!
let view = new EditorView(editor, {
  state: EditorState.create({
    doc: mySchema.nodeFromJSON(initialDoc),
    plugins: [
      ...exampleSetup({ schema: mySchema }).concat(arrowHandlers),
      imagePlugin(mySchema, { ...defaultSettings }),
      lintPlugin,
      searchReplacePlugin2
    ]
  }),
  nodeViews: {code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos)}
})


let search = document.querySelector('#search') as HTMLInputElement;
let replace = document.querySelector('#replace') as HTMLInputElement;

document.getElementById('go')?.addEventListener('click', () => {
  let s = editor.querySelector(".ProseMirror")!.innerHTML
  content.innerHTML = s.replaceAll(search.value, replace.value)
  view.updateState(EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(content),
    plugins: exampleSetup({ schema: mySchema })
  }))
})


document.querySelector('search')?.addEventListener('change', () => {
  let s = editor.querySelector(".ProseMirror")!.innerHTML
  content.innerHTML = s
  view.updateState(EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(content),
    plugins: exampleSetup({ schema: mySchema })
  }))
})

