import { Schema, NodeSpec, Node } from "prosemirror-model"
import { EditorState } from "prosemirror-state"
import { mySchema } from "./schema"
import { Dropdown, DropdownSubmenu, IconSpec, MenuElement, MenuItem, MenuItemSpec, blockTypeItem, icons, joinUpItem, liftItem, menuBar, redoItem, renderGrouped, selectParentNodeItem, undoItem, wrapItem } from "prosemirror-menu"
import {buildInputRules, buildKeymap, buildMenuItems, exampleSetup } from "prosemirror-example-setup"
import { Transaction } from "prosemirror-state"
import { Command, Plugin } from 'prosemirror-state';




const dinos = ["brontosaurus", "stegosaurus", "triceratops",
               "tyrannosaurus", "pterodactyl"]

export var dinoNodeSpec: NodeSpec = {
    // Dinosaurs have one attribute, their type, which must be one of
    // the types defined above.
    // Brontosaurs are still the default dino.
    attrs: {type: {default: "brontosaurus"}},
    inline: true,
    group: "inline",
    draggable: true,

    toDOM: (node:Node) => ["img", {"dino-type": node.attrs.type,
                            src: "/img/dino/" + node.attrs.type + ".png",
                            title: node.attrs.type,
                            class: "dinosaur"}],

    parseDOM: [{
        tag: "img[dino-type]",
        getAttrs: (dom: HTMLElement | string) => {
            if (typeof(dom) == "string")
            {
                throw new Error('string');
            }
            else
            {
                var type = dom.getAttribute("dino-type");
            }
            return dinos.indexOf(type!) > -1 ? {type} : false
        }
        }]
    }

let dinoType = mySchema.nodes.dino

function insertDino(type: string) {
  return function(state:EditorState, dispatch: (tr: Transaction) => void) {
    let {$from} = state.selection, index = $from.index()
    if (!$from.parent.canReplaceWith(index, index, dinoType))
      return false
    if (dispatch)
      dispatch(state.tr.replaceSelectionWith(dinoType.create({type})))
    return true
  }
}

// Ask example-setup to build its basic menu
var menu = buildMenuItems(mySchema)
// Add a dino-inserting item for each type of dino
let m = menu.insertMenu as Dropdown2;
dinos.forEach(name => m.content.push(new MenuItem({
  title: "Insert " + name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  enable: (state: EditorState) => { return insertDino(name)(state, null) },
  run: insertDino(name)
})))

interface Dropdown2 extends Dropdown {
  content: MenuItem[]; 
  fullMenu: MenuItem[][];
}

export {m, menu};
