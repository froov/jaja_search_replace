import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import "prosemirror-image-plugin/dist/styles/common.css";
import "prosemirror-image-plugin/dist/styles/withResize.css";
import "prosemirror-image-plugin/dist/styles/sideResize.css";
import * as cmd from './lint'

import {MenuItem} from "prosemirror-menu"
import {buildMenuItems} from "prosemirror-example-setup"
import {dinoMenu,dinoSchema} from "./dinos"

// ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// )
import { EditorState, Transaction } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { DOMParser, Fragment, Node, NodeType, Slice } from "prosemirror-model"
import { Transform } from 'prosemirror-transform';
import { exampleSetup } from "prosemirror-example-setup"
import { initialDoc } from "./schema"
//import {CodeBlockView,arrowHandlers} from "./codemirror"
import { defaultSettings, imagePlugin } from "prosemirror-image-plugin"


const sch = dinoSchema
const doc =  {
  type: "doc",
  content: [
    {
      content: [
        {
          text: "Start typing! in my dreams I know prose mirror",
          type: "text",
        },
      ],
      type: "paragraph",
    },
  ]
}


let editor = document.querySelector("#editor")!
let content = document.querySelector("#content")!
let view = new EditorView(editor, {
  state: EditorState.create({
    doc: sch.nodeFromJSON(doc),
    plugins: [
      ...exampleSetup({ 
        schema: sch,
        menuContent: dinoMenu
       }),
      //.concat(arrowHandlers),
      imagePlugin(sch, { ...defaultSettings }),
      cmd.lintPlugin(),
    ]
  }),
 // nodeViews: {code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos)}
})


let search = document.querySelector('#search') as HTMLInputElement;
let replace = document.querySelector('#replace') as HTMLInputElement;
let caseSensitive = document.querySelector('#caseSensitive') as HTMLInputElement;
let replaceButton = document.querySelector('#replaceButton') as HTMLInputElement;
let replaceNextButton = document.querySelector('#replaceNextButton') as HTMLInputElement;
let nextButton = document.querySelector('#nextButton') as HTMLInputElement;
let lastButton = document.querySelector('#lastButton') as HTMLInputElement;


document.getElementById('search')?.addEventListener('input', () => {
  cmd.setSearchCommand(view.state.doc, search.value)(view.state, view.dispatch, view)
  let disableButton = !cmd.validSearch(view.state.doc, cmd.pluginKey.getState(view.state)!)
  replaceButton.disabled = disableButton
  replaceNextButton.disabled = disableButton
  nextButton.disabled = disableButton
  lastButton.disabled = disableButton
  document.getElementById('matchStatus')!.innerHTML = `Match ${cmd.pluginKey.getState(view.state)!.matchIndex + 1} of ${cmd.pluginKey.getState(view.state)!.matchCount}`
})

document.getElementById('replace')?.addEventListener('input', () => {
  cmd.setReplaceCommand(replace.value)(view.state, view.dispatch, view)
})

document.getElementById('replaceButton')?.addEventListener('click',()=> {
  cmd.replaceCommand(view.state, view.dispatch, view)
})

document.getElementById('caseSensitive')?.addEventListener('click',()=> {
  cmd.setCaseCommand(caseSensitive.checked)(view.state, view.dispatch, view)
})

document.getElementById('replaceNextButton')?.addEventListener('click',()=> {
  cmd.replaceNextCommand(view.state, view.dispatch, view)
})

document.getElementById('nextButton')?.addEventListener('click',()=> {
  cmd.selectNextCommand(view.state.doc, search.value)(view.state, view.dispatch, view)
  nextButton.disabled = cmd.endMatch(view.state.doc, cmd.pluginKey.getState(view.state)!)
  lastButton.disabled = cmd.beginMatch(view.state.doc, cmd.pluginKey.getState(view.state)!)
  document.getElementById('matchStatus')!.innerHTML = `Match ${cmd.pluginKey.getState(view.state)!.matchIndex + 1} of ${cmd.pluginKey.getState(view.state)!.matchCount}`
})

document.getElementById('lastButton')?.addEventListener('click',()=> {
  cmd.selectLastCommand(view.state.doc, search.value)(view.state, view.dispatch, view)
  lastButton.disabled = cmd.beginMatch(view.state.doc, cmd.pluginKey.getState(view.state)!)
  nextButton.disabled = cmd.endMatch(view.state.doc, cmd.pluginKey.getState(view.state)!)
  document.getElementById('matchStatus')!.innerHTML = `Match ${cmd.pluginKey.getState(view.state)!.matchIndex + 1} of ${cmd.pluginKey.getState(view.state)!.matchCount}`
})