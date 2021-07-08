import { EventDispatcher } from "three";
import { isUndefined } from "../Util";

const MOUSELEAVE = "mouseleave";
const MOUSEENTER = "mouseenter";

/* 注入事件 */
Object.assign(EventDispatcher.prototype, {
  addEventListener(type, listener) {
    return this.on(type, listener);
  },
  removeEventListener(type, listener) {
    return this.off(type, listener);
  },
  dispatchEvent(event) {
    return this._fire(event);
  },
  on(type, listener) {
    const events = type.split(" ");

    for (let i = 0, length = events.length; i < length; i++) {
      if (this._listeners === undefined) this._listeners = {};

      const listeners = this._listeners;

      if (listeners[type] === undefined) {
        listeners[type] = [];
      }

      if (listeners[type].indexOf(listener) === -1) {
        listeners[type].push(listener);
      }
    }

    return this;
  },
  off(type, listener) {
    const events = type.split(" ");

    for (let i = 0, length = events.length; i < length; i++) {
      if (this._listeners === undefined) return;

      const listeners = this._listeners;
      const listenerArray = listeners[type];

      if (listenerArray !== undefined) {
        const index = listenerArray.indexOf(listener);

        if (index !== -1) {
          listenerArray.splice(index, 1);
        }
      }
    }

    return this;
  },
  fire(event) {
    return this._fire(event);
  },
  _fire(event) {
    if (this._listeners === undefined) return;

    const listeners = this._listeners;
    const listenerArray = listeners[event.type];

    if (!isUndefined(listenerArray)) {
      // 修改原始代码句:
      // event.target = this
      // 由于EventCaster需要使用target关键词作为事件点击目标，currentTarget作为事件绑定目标，
      // 所以修改源码不能由 target = this 改为 currentTarget = this 作为绑定目标也符合现代编码.
      event.currentTarget = this;
      event.target = event.target || this;

      // Make a copy, in case listeners are removed while iterating.
      const array = listenerArray.slice(0);
      for (let i = 0, l = array.length; i < l; i++) {
        array[i].call(this, event);
      }
    }
  },
  _fireAndBubble(event, compareShape, target = this) {
    const evt = event;
    const eventType = event.type;
    if (evt && this.isObject3D && target) {
      evt.target = target || this;
    }
    const shouldStop =
      (eventType === MOUSEENTER || eventType === MOUSELEAVE) &&
      ((compareShape &&
        (this === compareShape || (this.isAncestorOf && this.isAncestorOf(compareShape)))) ||
        (this.isScene && !compareShape));

    if (!shouldStop) {
      this._fire(event);

      // simulate event bubbling
      const stopBubble =
        (eventType === MOUSEENTER || eventType === MOUSELEAVE) &&
        compareShape &&
        compareShape.isAncestorOf &&
        compareShape.isAncestorOf(this) &&
        !compareShape.isAncestorOf(this.parent);
      if (
        ((evt && !evt.cancelBubble) || !evt) &&
        this.parent &&
        this.parent.isListening() &&
        !stopBubble
      ) {
        if (compareShape && compareShape.parent) {
          this._fireAndBubble.call(this.parent, event, compareShape, target);
        } else {
          this._fireAndBubble.call(this.parent, event, undefined, target);
        }
      }
    }
  }
});
