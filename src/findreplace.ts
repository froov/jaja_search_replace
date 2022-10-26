import { EditorState,Transaction, Plugin, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import { Node } from "prosemirror-model"

interface Dispatch {
    state: EditorState,
    dispatch: (e: Transaction) => void
  }
  
  interface Problem extends HTMLElement {
    ["data-problem"]?: Result 
  }
  // Words you probably shouldn't use
  const badWords = /\b(obviously|clearly|evidently|simply)\b/ig
  // Matches punctuation with a space before it
  const badPunc = / ([,\.!?:]) ?/g
  const search = document.getElementById('search') as HTMLInputElement;
  const searchs = search?.value
  const searchString = new RegExp(searchs)

  const replace = document.getElementById('replace') as HTMLInputElement;
  const replaceString = replace?.value
  
  interface Result {
    from: number, to: number, fix?: (props: Dispatch)=>void
  }
  function lint(doc: Node) {
    let result: Result []= []
  
    // For each node in the document
    doc.descendants((node: Node, pos: number, parent: Node|null ) => {
      if (node.isText) {
        // Scan text nodes for searched word
    
        let text = node.text
        let m : RegExpExecArray|null
        while ( m = searchString.exec(node.text!)) {
          const from = pos + m.index
          const to = pos + m.index + m[0].length 
          const fix = ({state, dispatch}:Dispatch) => {
            dispatch(state.tr.replaceWith(from, to,
                                          state.schema.text(replaceString)))}    
            result.push({from, to, fix})
             }
        }
      })
    return result
  }
  
  
  function lintDeco(doc: Node) {
    let decos : Decoration[] = []
    lint(doc).forEach(prob => {
      decos.push(Decoration.inline(prob.from, prob.to, {class: "problem"}),
                 Decoration.widget(prob.from, lintIcon(prob)))
    })
    return DecorationSet.create(doc, decos)
  }
  
  function lintIcon( prob: Result) {
    let icon = document.createElement("div") as Problem
    icon.className = "lint-icon"
    //icon.title = prob.msg;
    icon["data-problem"] = prob
    return icon
  }
  
  export  const lintPlugin = new Plugin({
    state: {
      init(_, {doc}) { return lintDeco(doc) },
      apply(tr, old) { return tr.docChanged ? lintDeco(tr.doc) : old }
    },
    props: {
      decorations(state) { return this.getState(state) },
      handleClick(view, _, event: MouseEvent) {
        const el = event.target as HTMLElement
        const result = (event.target as Problem)["data-problem"]
        if (result && /lint-icon/.test(el.className)) {
          let {from, to} = result
          view.dispatch(
            view.state.tr
              .setSelection(TextSelection.create(view.state.doc, from, to))
              .scrollIntoView())
          return true
        }
      },
      handleDoubleClick(view, _, event) {
        const el = event.target as HTMLElement
        const result = (event.target as Problem)["data-problem"]
        if (result && /lint-icon/.test(el.className)) {
          let prob = result
          if (prob.fix) {
            prob.fix(view)
            view.focus()
            return true
          }
        }
      }
    }
  })
  
  