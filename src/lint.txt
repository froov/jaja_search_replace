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
  
  interface Result {
    msg: string, from: number, to: number, fix?: (props: Dispatch)=>void
  }
  function lint(doc: Node) {
    let result: Result []= []
    let lastHeadLevel: number|null = null
  
    // For each node in the document
    doc.descendants((node: Node, pos: number, parent: Node|null ) => {
      if (node.isText) {
        // Scan text nodes for suspicious patterns
    
        let text = node.text
        let m : RegExpExecArray|null
        while ( m = badWords.exec(node.text!)) {
          const from = pos + m.index
          const to = pos + m.index + m[0].length
          result.push({msg: `Try not to say '${m[0]}'`,from,to})        
        }
  
        while (m = badPunc.exec(node.text!)) {
          const from = pos + m.index
          const to = pos + m.index + m[0].length
          const fix = ({state, dispatch}:Dispatch) => {
                  dispatch(state.tr.replaceWith(from, to,
                                                state.schema.text(m![1] + " ")))}
          result.push({
            msg: "Suspicious spacing around punctuation",
            from, to, fix})
          }
      } else if (node.type.name == "heading") {
        // Check whether heading levels fit under the current level
        let level = node.attrs.level
        if (lastHeadLevel != null && level > lastHeadLevel + 1) {
          const from=pos + 1
          const to= pos + 1 + node.content.size
    
        const fix = ({state, dispatch}:Dispatch) => {
          dispatch(state.tr.setNodeMarkup(from - 1, null, {level:lastHeadLevel! + 1}))
        }
          result.push({ msg: `Heading too small (${level} under ${lastHeadLevel})`, from,to,fix})
          }
        
        lastHeadLevel = level
      } else if (node.type.name == "image" && !node.attrs.alt) {
        // Ensure images have alt text
        const from = pos
        const to = pos+1
        let alt = prompt("Alt text", "")
        const fix =   ({state,dispatch}:Dispatch) => {
          if (alt) {
            let attrs = Object.assign({}, state.doc.nodeAt(from)?.attrs, {alt})
            dispatch(state.tr.setNodeMarkup(from, null, attrs))
          }        
        }
        result.push({msg:"Image without alt text", from,to,fix})
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
    icon.title = prob.msg;
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
  
  