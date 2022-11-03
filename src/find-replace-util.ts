import { Node} from "prosemirror-model"
import { EditorView } from "prosemirror-view"
import { EditorState } from "prosemirror-state"

export function getNodeEndpoints(context: EditorState, node: Node) {
  let offset = 0

  if(context.doc === node) return { from: offset, to: offset + node.nodeSize }

  if(node.isBlock) {
    for(let i=0; i<context.doc.content.length; i++) {
      let result = getNodeEndpoints(context.content.content[i], node)
      if(result) return {
        from: result.from + offset + (context.type.kind === null ? 0 : 1),
        to: result.to + offset + (context.type.kind === null ? 0 : 1)
      }
      offset += context.content.content[i].nodeSize
    }
    return null
  } else {
    return null
  }
}
