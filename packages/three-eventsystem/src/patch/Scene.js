import { Scene } from "three";

Scene.prototype.isAncestorOf = function (node) {
  let parent = node.parent;
  while (parent) {
    if (parent.id === this.id) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
};
