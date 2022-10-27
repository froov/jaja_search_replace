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
  //const badWords = /\b(obviously|clearly|evidently|simply)\b/ig
  // Matches punctuation with a space before it
  //const badPunc = / ([,\.!?:]) ?/g
  const search = document.querySelector('#search') as HTMLInputElement;
  let replace = document.querySelector('#replace') as HTMLInputElement;
  let searchs: string

  search?.addEventListener('change', () => {
    let searchinput = document.getElementById('search') as HTMLInputElement;
    var searchs = searchinput?.value
  })

  /*
  search!.addEventListener('change', updateSearch);
  function updateSearch(s){
    const searchs = s?.value
    return searchs
  }
  //const searchs = ''
  //const searchString = new RegExp(searchs)

  const replace = document.getElementById('replace') as HTMLInputElement;
  const replaceString = replace?.value
 */ 
  interface Result {
    from: number, to: number, fix?: (props: Dispatch)=>void
  }
  /*
  function searchreplace(doc: Node) {
    let result: Result []= []
  
    // For each node in the document
    doc.descendants((node: Node, pos: number, parent: Node|null ) => {
      if (node.isText) {
        // Scan text nodes for searched word
    
        //let text = node.text
        let m : RegExpExecArray|null;
        for (let index in (m = searchString.exec(node.text!))) {
          console.log(m)
          const from = pos + m.index
          const to = pos + m.index + m[0].length 
          const fix = ({state, dispatch}:Dispatch) => {
            dispatch(state.tr.replaceWith(from, to,
                                          state.schema.text(replaceString)))}    
            result.push({from, to, fix})
            break;
        }
      }
    })
    return result
  }
  */

  function searchreplace(doc: Node) : Result[] {
    let result: Result[] = []
    if (!searchs) return result
    // For each node in the document
    doc.descendants((node: Node, pos: number, parent: Node | null) => {
      if (node.isText) {
        let text = node.text!
        let index = 0
        while (index!=-1) {
          index = text.indexOf(searchs,index)
          if (index != -1) {
            const from = pos + index
            const to = pos + index + searchs.length
            result.push({ from, to })
            console.log(from,to, node.text)
            index += searchs.length
          }
        }
      }
    })
  
    return result
  }
  
  function searchDeco(doc: Node) {
    let decos : Decoration[] = []
    searchreplace(doc).forEach(prob => {
      decos.push(Decoration.inline(prob.from, prob.to, {class: "problem"}),
                 Decoration.widget(prob.from, searchIcon(prob)))
    })
    return DecorationSet.create(doc, decos)
  }
  
  function searchIcon( prob: Result) {
    let icon = document.createElement("div") as Problem
    icon.className = "search-icon"
    //icon.title = prob.msg;
    icon["data-problem"] = prob
    return icon
  }
  
  export  const searchReplacePlugin2 = new Plugin({
    state: {
      init(_, {doc}) { return searchDeco(doc) },
      apply(tr, old) { return tr.docChanged ? searchDeco(tr.doc) : old }
    },
    props: {
      decorations(state) { return this.getState(state) },
      handleClick(view, _, event: MouseEvent) {
        const el = event.target as HTMLElement
        const result = (event.target as Problem)["data-problem"]
        if (result && /search-icon/.test(el.className)) {
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
        if (result && /search-icon/.test(el.className)) {
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
  
  