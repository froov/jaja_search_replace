import { EditorState, Transaction, Plugin, PluginKey, TextSelection, Command } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Node } from "prosemirror-model"
import { countColumn } from "@codemirror/state"

// we want to treat the "search" pattern as a lint, but then mark it differently
// in general we might want different kinds of lint, like chill blue and angry red.
const chillColor = 'blue'

// this should probably not be globals; we might want to have two editors with different search parameters

type SearchData = {
  ds?: DecorationSet
  searchPattern: string
  replace: string
  matchCase: false
  matchIndex: number
  matchCount: number
  matchWholeWord: boolean
  findInSelection: boolean
  matchStartPos: number
}

export const pluginKey = new PluginKey<SearchData>('search-replace2');
function getSearch(editorState: EditorState) {
  return pluginKey.getState(editorState);
}

class Match {
  constructor(public begin: number, public end: number) { }
}

export function searchfun(s: string, p: SearchData): Match[] {
  if (!p.searchPattern)
    return []
  const r: Match[] = []
  const sp = p.matchCase ? p.searchPattern : p.searchPattern.toLowerCase()
  const xx = p.matchCase ? s : s.toLowerCase()
  let idx = xx.indexOf(sp)

  while (idx !== -1) {
    r.push(new Match(idx, idx + sp.length));
    idx = xx.indexOf(sp, idx + 1);
  }
  return r
}

// this should probably be in prose-mirror, it's a common structure passed to functions
interface Dispatch {
  state: EditorState,
  dispatch: (e: Transaction) => void
}

// Each lint identified. 
interface LintResult {
  color?: string,
  msg: string, from: number, to: number, fix?: (props: Dispatch) => void
}
// we will store the problem information directly on the icon decoration, so this extends the HTMLElement for typescript
interface LintIconDiv extends HTMLElement {
  ["data-problem"]?: LintResult
}
// create div for our lint icon.
function lintIcon(prob: LintResult) {
  let icon = document.createElement("div") as LintIconDiv
  icon.className = "lint-icon"
  icon.title = prob.msg;
  icon["data-problem"] = prob
  if (prob.color)
    icon.style.backgroundColor = prob.color
  return icon
}

// Words you probably shouldn't use
const badWords = /\b(obviously|clearly|evidently|simply)\b/ig
// Matches punctuation with a space before it
const badPunc = / ([,\.!?:]) ?/g

//check if there are any matches in the document. True = matches/False = no matches
export function validSearch(doc: Node, sd: SearchData){
  let validSearchResult: boolean = false
  doc.descendants((node: Node, pos: number, parent: Node | null) => {
    if (node.isText) {
      // add search 
      const sr = searchfun(node.text ?? "", sd)
      for (let o of sr) {
        const from = pos + o.begin
        const to = pos + o.end
        validSearchResult = true;
        if (validSearchResult === true){break;}
      }
    }
  })
  return validSearchResult;
}

function lint(doc: Node, sd: SearchData) {
  let result: LintResult[] = []
  let lastHeadLevel: number | null = null

  // For each node in the document
  doc.descendants((node: Node, pos: number, parent: Node | null) => {
    if (node.isText) {
      // add search 
      const sr = searchfun(node.text ?? "", sd)
      for (let o of sr) {
        const from = pos + o.begin
        const to = pos + o.end
        // const fix = ({ state, dispatch }: Dispatch) => {
        //   dispatch(state.tr.replaceWith(from, to,
        //     state.schema.text(sd.replace)))
        // }
        if (sd.replace == "") {
          let fix = ({ state, dispatch }: Dispatch) => {
            dispatch(state.tr.delete(from, to))
            }
          result.push({
            color: 'green',
            msg: "Double click to delete " + sd.searchPattern,
            from,
            to,
            fix
          })
        } else {
          let fix = ({ state, dispatch }: Dispatch) => {
          dispatch(state.tr.replaceWith(from, to,
            state.schema.text(sd.replace)))
          }
          result.push({
            color: 'green',
            msg: "Double click to replace with " + '"' + sd.replace + '"',
            from,
            to,
            fix
          })
        }
      }


      // Scan text nodes for suspicious patterns
      //let text = node.text
      let m: RegExpExecArray | null
      while (m = badWords.exec(node.text!)) {
        const from = pos + m.index
        const to = pos + m.index + m[0].length
        result.push({ msg: `Try not to say '${m[0]}'`, from, to })
      }

      while (m = badPunc.exec(node.text!)) {
        const from = pos + m.index
        const to = pos + m.index + m[0].length
        const fix = ({ state, dispatch }: Dispatch) => {
          dispatch(state.tr.replaceWith(from, to,
            state.schema.text(m![1] + " ")))
        }
        result.push({
          msg: "Suspicious spacing around punctuation",
          color: chillColor,
          from, to, fix
        })
      }
    } else if (node.type.name == "heading") {
      // Check whether heading levels fit under the current level
      let level = node.attrs.level
      if (lastHeadLevel != null && level > lastHeadLevel + 1) {
        const from = pos + 1
        const to = pos + 1 + node.content.size

        const fix = ({ state, dispatch }: Dispatch) => {
          dispatch(state.tr.setNodeMarkup(from - 1, null, { level: lastHeadLevel! + 1 }))
        }
        result.push({ msg: `Heading too small (${level} under ${lastHeadLevel})`, from, to, fix })
      }

      lastHeadLevel = level
    } else if (node.type.name == "image" && !node.attrs.alt) {
      // Ensure images have alt text
      const from = pos
      const to = pos + 1
      let alt = prompt("Alt text", "")
      const fix = ({ state, dispatch }: Dispatch) => {
        if (alt) {
          let attrs = Object.assign({}, state.doc.nodeAt(from)?.attrs, { alt })
          dispatch(state.tr.setNodeMarkup(from, null, attrs))
        }
      }
      result.push({ msg: "Image without alt text", from, to, fix })
    }
  })

  return result
}
// returns the new state of the plugin.

function lintDeco(doc: Node, sd: SearchData): SearchData {
  let decos: Decoration[] = []
  lint(doc, sd).forEach(prob => {
    const cl = `problem-${prob.color ?? "red"}`
    decos.push(Decoration.inline(prob.from, prob.to, { class: cl }),
      Decoration.widget(prob.from, lintIcon(prob)))
  })
  const r = {
    ...sd,
    ds: DecorationSet.create(doc, decos)
  }
  console.log("new state", r)
  return r
}

export function lintPlugin() {
  const st: SearchData = {
    searchPattern: "",
    replace: "",
    matchCase: false,
    matchIndex: 0,
    matchCount: 0,
    matchWholeWord: false,
    findInSelection: false,
    matchStartPos: 0
  }
  let r = new Plugin({
    key: pluginKey,
    state: {
      // lint the very first time.
      init(_, { doc }) {
        return lintDeco(doc, st)
      },
      // this runs every time the document changes, not efficient.
      apply(tr, old) {
        const getMeta = tr.getMeta(pluginKey)
        if (getMeta) {
          return lintDeco(tr.doc, getMeta)
        }
        console.log("changed",)
        return tr.docChanged ? lintDeco(tr.doc, old) : old
      }
    },

    props: {
      decorations(state: EditorState) {
        return this.getState(state).ds
      },
      // note that these event handlers are for the entire editor, we need to check first if the click falls on one of our icons.
      handleClick(view, _, event: MouseEvent) {
        const el = event.target as HTMLElement
        const result = (event.target as LintIconDiv)["data-problem"]
        if (result && /lint-icon/.test(el.className)) {
          let { from, to } = result
          view.dispatch(
            view.state.tr
              .setSelection(TextSelection.create(view.state.doc, from, to))
              .scrollIntoView())
          return true
        }
      },
      handleDoubleClick(view, _, event) {
        const el = event.target as HTMLElement
        const result = (event.target as LintIconDiv)["data-problem"]
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
  return r
}

// build a search command
export function setSearchCommand(doc: Node, s: string, csen?: boolean): Command {
  return (state: EditorState, dispatch) => {
    let sd = pluginKey.getState(state)
    if (!sd) {
      console.log("no state")
      return false
    }
    if (dispatch) {
      let updateSearch = {
        ...sd,
        searchPattern: s,
        matchIndex: 0,
      }
      let mc = 0
      doc.descendants((node: Node, pos: number, parent: Node | null) => {
        if (node.isText && node.text) {
          const sr = searchfun(node.text, updateSearch)
          mc += sr.length
          console.log("matchCount = "+ mc)
      }
    })
      let newSearch = {
        ...updateSearch,
        matchCount: mc,
      }
      console.log(newSearch)
      dispatch(state.tr.setMeta(pluginKey, newSearch))
    }
    return true
  }
}

export function setReplaceCommand(r: string): Command {
  return (state: EditorState, dispatch) => {
    let sd = pluginKey.getState(state)
    if (!sd) {
      console.log("no state")
      return false
    }
    if (dispatch) {
      let newSearch = {
        ...sd,
         replace: r
      }
      console.log(newSearch)
      dispatch(state.tr.setMeta(pluginKey, newSearch))
    }
    return true
  }
}

export function setCaseCommand(csen: boolean): Command {
  return (state: EditorState, dispatch) => {
    let sd = pluginKey.getState(state)
    if (!sd) {
      console.log("no state")
      return false
    }
    if (dispatch) {
      let newSearch = {
        ...sd,
         matchCase: csen
      }
      console.log(newSearch)
      dispatch(state.tr.setMeta(pluginKey, newSearch))
    }
    return true
  }
}

type DispatchFn = ((tr:Transaction)=>void) | undefined

export const replaceNextCommand : Command =  (state: EditorState, dispatch: DispatchFn) => {
    const sd = pluginKey.getState(state)
    if (sd) {
      let tr = state.tr
      let doc = state.doc
      let delta =  sd.replace.length - sd.searchPattern.length
      let offset = 0
      let doctext = doc.textContent
      doc.descendants((node: Node, pos: number, parent: Node | null) => {
        console.log("pos ="+ pos)
        const sr = searchfun(doctext, sd)
        sd.matchCount = sr.length
          for (let o of sr){
            if (sd.replace == ""){
              tr = tr.setSelection(TextSelection.create(doc, pos + o.begin+offset, pos + o.end+offset)) //change this to selection
              sd.matchStartPos = pos + o.begin+offset
              offset += delta
            } else {
              sd.matchStartPos = pos + o.begin+offset
              tr = tr.replaceWith(pos + o.begin+offset, pos + o.end+offset,
              state.schema.text(sd.replace))
              offset += delta 
            }
          }
      })

      if (dispatch)
        dispatch(tr)     
    }
    return true
}

export const replaceCommand : Command =  (state: EditorState, dispatch: DispatchFn) => {
  const sd = pluginKey.getState(state)
  if (sd) {
    let tr = state.tr
    let doc = state.doc
    let delta =  sd.replace.length - sd.searchPattern.length
    let offset = 0
    let count = 0
    doc.descendants((node: Node, pos: number, parent: Node | null) => {
      if (node.isText && node.text) {
        const sr = searchfun(node.text, sd)
        console.log("found", sr)
        for (let o of sr) {
          if (sd.replace == ""){
            tr = tr.delete(pos + o.begin+offset, pos + o.end+offset)
            offset += delta
            
          } else {
            tr = tr.replaceWith(pos + o.begin+offset, pos + o.end+offset,
            state.schema.text(sd.replace))
            offset += delta 
            
          }
        }
      }
    })
    if (dispatch)
      dispatch(tr)      
  }
  return true
}

export function selectNextCommand(doc: Node, s: string, csen?: boolean): Command {
  return (state: EditorState, dispatch) => {
    let sd = pluginKey.getState(state)
    if (!sd) {
      console.log("no state")
      return false
    }
    if (dispatch) {
      let mi = sd!.matchIndex
      if (mi < sd!.matchCount - 1){
        mi ++ 
        let newSearch = {
          ...sd,
          matchIndex: mi,
        }
        console.log(newSearch)
    
        dispatch(state.tr.setMeta(pluginKey, newSearch))
      }
    }
    return true
  }
}

export function selectLastCommand(doc: Node, s: string, csen?: boolean): Command {
  return (state: EditorState, dispatch) => {
    let sd = pluginKey.getState(state)
    if (!sd) {
      console.log("no state")
      return false
    }
    if (dispatch) {
      let mi = sd!.matchIndex
      if (mi > 0){
        mi -- 
        let newSearch = {
          ...sd,
          matchIndex: mi,
        }
        console.log(newSearch)
    
        dispatch(state.tr.setMeta(pluginKey, newSearch))
      }
    }
    return true
  }
}

//Disables Next button at the end of the match index 
export function endMatch(doc: Node, sd: SearchData){
  let endMatchResult: boolean = false
  if (sd.matchIndex == sd.matchCount -1){
    endMatchResult = true
  }
  return endMatchResult;
}

export function beginMatch(doc: Node, sd: SearchData){
  let beginMatchResult: boolean = false
  if (sd.matchIndex == 0){
    beginMatchResult = true
  }
  return beginMatchResult;
}