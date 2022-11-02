import { EditorState,Transaction, Plugin, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet, EditorView} from "prosemirror-view"
import { Node } from "prosemirror-model"


interface Dispatch {
    state: EditorState,
    dispatch: (e: Transaction) => void
  }
  
  interface Problem extends HTMLElement {
    ["data-problem"]?: Result 
  }

  //var search : HTMLInputElement;
  //var searchs: string;
  
  /*
  document.querySelector('#search')?.addEventListener('change', ()=> {  
    return function(state:EditorState, dispatch: (tr: Transaction) => void){
      if (dispatch)
      dispatch(state.tr.scrollIntoView())
  }})
*/
  //const searchString = new RegExp(searchs)
  var search : HTMLInputElement;
  var searchs: string;

  document.querySelector('#search')?.addEventListener('change', ()=> {  
    search = document.getElementById('search') as HTMLInputElement;
    searchs = search?.value
    return searchs
  });

  const replace = document.getElementById('replace') as HTMLInputElement;
  const replaceString = replace?.value
  
  interface Result {
    from: number, to: number, fix?: (props: Dispatch)=>void
  }

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
  
  