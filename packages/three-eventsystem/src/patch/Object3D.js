import { Object3D } from "three";

// 监听事件 为true可以获取事件监听
Object3D.prototype.listening = true;

Object3D.prototype.isListening = function () {
  return this.listening;
};
Object3D.prototype.isAncestorOf = function () {
  return false;
};
Object3D.prototype.preventDefault = function () {
  return false;
};
