import { Schema, NodeSpec, Node } from "prosemirror-model"

type: Attr

const dinos = ["brontosaurus", "stegosaurus", "triceratops",
               "tyrannosaurus", "pterodactyl"]

export const dinoNodeSpec: NodeSpec = {
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