import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import "prosemirror-image-plugin/dist/styles/common.css";
import "prosemirror-image-plugin/dist/styles/withResize.css";
import "prosemirror-image-plugin/dist/styles/sideResize.css";
import {lintPlugin, setSearchCommand,setReplaceCommand, replaceCommand, setCaseCommand, searchfun, pluginKey} from './lint'

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
      lintPlugin(),
    ]
  }),
 // nodeViews: {code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos)}
})


let search = document.querySelector('#search') as HTMLInputElement;
let replace = document.querySelector('#replace') as HTMLInputElement;
let caseSensitive = document.querySelector('#caseSensitive') as HTMLInputElement;
let replaceButton = document.querySelector('#replaceButton') as HTMLInputElement;
let replaceNextButton = document.querySelector('#replaceNextButton') as HTMLInputElement;

document.getElementById('search')?.addEventListener('input', () => {
  setSearchCommand(search.value)(view.state, view.dispatch, view)
  replaceButton.disabled = !search.value
  replaceNextButton.disabled = validSearch(search.value, searchfun(search.value,pluginKey.getState(view.state)!).length == 0)
  console.log(replaceNextButton.disabled)
  console.log(searchfun(search.value,pluginKey.getState(view.state)!).length)
  console.log(searchfun(search.value,pluginKey.getState(view.state)!))
  console.log(pluginKey.getState(view.state))
})

function validSearch(searchValue: string, searchResult: boolean){
  if (searchValue){
    if (searchResult) {
      return true;
    } else return false;
//disable the button if search value does not exist OR no search results
  } return false;
}

document.getElementById('replace')?.addEventListener('input', () => {
  setReplaceCommand(replace.value)(view.state, view.dispatch, view)
  replaceButton.disabled = search.value? false: true
  replaceNextButton.disabled = search.value? false: true
  console.log(replaceNextButton.disabled)
  console.log("SearchReplace Replace Edit")
})

document.getElementById('replaceButton')?.addEventListener('click',()=> {
  replaceCommand(view.state, view.dispatch, view)
})

document.getElementById('caseSensitive')?.addEventListener('click',()=> {
  setCaseCommand(caseSensitive.checked)(view.state, view.dispatch, view)
  console.log('caseSensitive')
})
