import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import "prosemirror-image-plugin/dist/styles/common.css";
import "prosemirror-image-plugin/dist/styles/withResize.css";
import "prosemirror-image-plugin/dist/styles/sideResize.css";

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
import { defaultSettings, updateImageNode, imagePlugin } from "prosemirror-image-plugin"
import {Decoration, DecorationSet} from "prosemirror-view"
import {Plugin, TextSelection} from "prosemirror-state"
import { Transaction , Command } from 'prosemirror-state'
import { Transform } from 'prosemirror-transform'



let editor = document.querySelector("#editor")!
let content = document.querySelector("#content")!
let view = new EditorView(editor, {
  state: EditorState.create({
    doc: mySchema.nodeFromJSON(initialDoc),
    plugins: [
      ...exampleSetup({ schema: mySchema }).concat(arrowHandlers),
      imagePlugin(mySchema, { ...defaultSettings }),
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


// Words you probably shouldn't use
const badWords = /\b(obviously|clearly|evidently|simply)\b/ig
// Matches punctuation with a space before it
const badPunc = / ([,\.!?:]) ?/g

function lint(doc: Node) {
  let result: { msg: string; from: number; to: number; fix: Function | null; }[]= [], lastHeadLevel: number|null = null

  function record(msg: string, from: number, to: number, fix: number|null) {
    result.push({msg, from, to, fix})
  }

  // For each node in the document
  doc.descendants((node: Node, pos: number, parent: Node|null ) => {
    if (node.isText) {
      // Scan text nodes for suspicious patterns
      let m
      while (m = badWords.exec(node.text!))
        record(`Try not to say '${m[0]}'`,
               pos + m.index, pos + m.index + m[0].length, null)
      while (m = badPunc.exec(node.text!))
        record("Suspicious spacing around punctuation",
               pos + m.index, pos + m.index + m[0].length,
               fixPunc(m[1] + " "))
    } else if (node.type.name == "heading") {
      // Check whether heading levels fit under the current level
      let level = node.attrs.level
      if (lastHeadLevel != null && level > lastHeadLevel + 1)
        record(`Heading too small (${level} under ${lastHeadLevel})`,
               pos + 1, pos + 1 + node.content.size,
               fixHeader(lastHeadLevel + 1))
      lastHeadLevel = level
    } else if (node.type.name == "image" && !node.attrs.alt) {
      // Ensure images have alt text
      record("Image without alt text", pos, pos + 1, addAlt(pos))
    }
  })

  return result
}

function fixPunc(replacement: string) {
  return function({state, dispatch}:{state:EditorState,dispatch:(tr: Transaction) => void}) {
    dispatch(state.tr.replaceWith(from, to,
                                  state.schema.text(replacement)))
  }
}

function fixHeader(level: number) {
  return function({state, dispatch}:{state:EditorState,dispatch:(tr: Transaction) => void}) {
    dispatch(state.tr.setNodeMarkup(this.from - 1, null, {level}))
  }
}

function addAlt(from: number, {state, dispatch}:{state:EditorState,dispatch:(tr: Transaction) => void}) {
  let alt = prompt("Alt text", "")
  if (alt) {
    let attrs = Object.assign({}, state.doc.nodeAt(from).attrs, {alt})
    dispatch(state.tr.setNodeMarkup(from, null, attrs))
  }
}

function lintDeco(doc: Node) {
  let decos: Decoration[]=[]
  lint(doc).forEach(prob => {
    decos.push(Decoration.inline(prob.from, prob.to, {class: "problem"}),
               Decoration.widget(prob.from, lintIcon(prob)))
  })
  return DecorationSet.create(doc, decos)
}

function lintIcon(prob: { msg: any; from?: number; to?: number; fix?: Function | null; }) {
  let icon = document.createElement("div")
  icon.className = "lint-icon"
  icon.title = prob.msg
  icon.problem = prob
  return icon
}

let lintPlugin = new Plugin({
  state: {
    init(_, {doc}) { return lintDeco(doc) },
    apply(tr, old) { return tr.docChanged ? lintDeco(tr.doc) : old }
  },
  props: {
    decorations(state) { return this.getState(state) },
    handleClick(view, _, event) {
      if (/lint-icon/.test(event.target!.className)) {
        let {from, to} = event.target!.problem
        view.dispatch(
          view.state.tr
            .setSelection(TextSelection.create(view.state.doc, from, to))
            .scrollIntoView())
        return true
      }
    },
    handleDoubleClick(view, _, event) {
      if (/lint-icon/.test(event.target!.className)) {
        let prob = event.target!.problem
        if (prob.fix) {
          prob.fix(view)
          view.focus()
          return true
        }
      }
    }
  }
})