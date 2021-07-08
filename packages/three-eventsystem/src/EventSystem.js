import "./patch/Object3D";
import "./patch/Scene";
import "./patch/EventDispatcher";
import { Scene, Raycaster, Vector2, WebGLRenderTarget, MeshBasicMaterial } from "three";
import Util from "./Util";
import Event from "./Event";

const EVENTS = {
  MOUSEOVER: "mouseover",
  MOUSEOUT: "mouseout",
  MOUSEENTER: "mouseenter",
  MOUSELEAVE: "mouseleave",
  MOUSEMOVE: "mousemove",
  MOUSEDOWN: "mousedown",
  MOUSEUP: "mouseup",
  CLICK: "click",
  DBL_CLICK: "dblclick",
  TOUCHSTART: "touchstart",
  TOUCHEND: "touchend",
  TOUCHMOVE: "touchmove",
  TAP: "tap",
  DBL_TAP: "dbltap",
  WHEEL: "wheel",
  CONTEXTMENU: "contextmenu",
  POINTERDOWN: "pointerdown",
  POINTERUP: "pointerup",
  POINTERMOVE: "pointermove",
  POINTERCANCEL: "pointercancel",
  LOSTPOINTERCAPTURE: "lostpointercapture"
};

const registerEvents = [
  EVENTS.MOUSEENTER,
  EVENTS.MOUSEMOVE,
  EVENTS.MOUSEOVER,
  EVENTS.MOUSEOUT,
  EVENTS.MOUSEDOWN,
  EVENTS.MOUSEUP,
  EVENTS.TOUCHSTART,
  EVENTS.TOUCHMOVE,
  EVENTS.TOUCHEND,
  EVENTS.WHEEL,
  EVENTS.CONTEXTMENU
  // EVENTS.POINTERDOWN,
  // EVENTS.POINTERMOVE,
  // EVENTS.POINTERUP,
  // EVENTS.POINTERCANCEL,
  // EVENTS.LOSTPOINTERCAPTURE
];

function addEvent(ctx, type) {
  const container = ctx.domElement || ctx.domElement.ownerDocument;
  const listener = ctx._listeners[type];
  container.addEventListener(type, listener, false);
}

function removeEvent(ctx, type) {
  const container = ctx.domElement || ctx.domElement.ownerDocument;
  const listener = ctx._listeners[type];
  container.removeEventListener(type, listener, false);
}

class EventSystem {
  constructor(scene, camera, renderer, domElement) {
    this.raycaster = new Raycaster();
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement || renderer.domElement;
    this.mouse = new Vector2(); // 相交坐标
    this.objects = []; // 缓冲对象
    this._pointerPositions = []; // 2d坐标
    this._changedPointerPositions = []; // 2d坐标

    this.targetShape = null; // 物体
    this.clickStartShape = null;
    this.clickEndShape = null;
    this.tapStartShape = null;

    // this.captureTouchEventsEnabled = false;
    this.listenClickTap = false;
    this.inDblClickWindow = false;
    this.dblClickWindow = 400;

    this._listeners = {};
    this.type = "ray";
    // gpu
    if (this.type === "gpu") {
      this.pickingScene = new Scene();
      this.pickingRenderTarget = new WebGLRenderTarget(
        this.renderer.domElement.offsetWidth,
        this.renderer.domElement.offsetHeight
      );
      this.pickingTexture = new WebGLRenderTarget(1, 1);
      this.pickingData = [];
      this.pixelBuffer = new Uint8Array(4);
      this.pickingMaterial = new MeshBasicMaterial();
      this.materialList = [];
    }

    this._bindContentEvents();
  }

  _mouseenter(evt) {
    this.setPointersPositions(evt);
    const event = new Event(EVENTS.MOUSEENTER, {
      originalEvent: evt,
      target: this.scene,
      currentTarget: this.scene
    });
    this.scene.fire(event);
  }

  _mouseover(evt) {
    this.setPointersPositions(evt);

    const event = new Event(EVENTS.MOUSEOVER, {
      originalEvent: evt,
      target: this.scene,
      currentTarget: this.scene
    });
    this.scene._fire(event);
  }

  _mouseout(evt) {
    this._pointerPositions = [];

    this.scene._fire(
      new Event(EVENTS.MOUSELEAVE, {
        originalEvent: evt,
        target: this.scene,
        currentTarget: this.scene
      })
    );

    this.scene._fire(
      new Event(EVENTS.MOUSEOUT, {
        originalEvent: evt,
        target: this.scene,
        currentTarget: this.scene
      })
    );
  }

  _mousemove(evt) {
    // workaround for mobile IE to force touch event when unhandled pointer event elevates into a mouse event
    // if (UA.ieMobile) {
    //   return this._touchmove(evt);
    // }
    this.setPointersPositions(evt);
    const pointerId = Util._getFirstPointerId(evt);
    let shape;
    const targetShape = this.targetShape ? this.targetShape : null; // 判断物体是否添加到scene
    // var targetShape = this.targetShape?.getStage() ? this.targetShape : null;
    const eventsEnabled = true;
    if (eventsEnabled) {
      // shape = this.getIntersection(this.getPointerPosition());
      const intersects = this._getIntersectObjects(this.getPointerPosition());
      const intersect = intersects[0] ? intersects[0] : null;
      shape = intersect ? intersect.object : null;
      if (shape && shape.isListening()) {
        const differentTarget = targetShape !== shape;
        if (eventsEnabled && differentTarget) {
          if (targetShape) {
            targetShape._fireAndBubble(
              new Event(EVENTS.MOUSEOUT, {
                originalEvent: evt,
                pointerId,
                intersects,
                intersect
              }),
              shape
            );

            targetShape._fireAndBubble(
              new Event(EVENTS.MOUSELEAVE, {
                originalEvent: evt,
                pointerId,
                intersects,
                intersect
              }),
              shape
            );
          }
          shape._fireAndBubble(
            new Event(EVENTS.MOUSEOVER, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            }),
            targetShape
          );
          shape._fireAndBubble(
            new Event(EVENTS.MOUSEENTER, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            }),
            targetShape
          );
          shape._fireAndBubble(
            new Event(EVENTS.MOUSEMOVE, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            })
          );
          this.targetShape = shape;
        } else {
          shape._fireAndBubble(
            new Event(EVENTS.MOUSEMOVE, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            })
          );
        }
      } else {
        /*
         * if no shape was detected, clear target shape and try
         * to run mouseout from previous target shape
         */
        if (targetShape && eventsEnabled) {
          targetShape._fireAndBubble(
            new Event(EVENTS.MOUSEOUT, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            })
          );
          targetShape._fireAndBubble(
            new Event(EVENTS.MOUSELEAVE, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            })
          );

          this.scene._fire(
            new Event(EVENTS.MOUSEOVER, {
              originalEvent: evt,
              target: this.scene,
              currentTarget: this.scene,
              pointerId,
              intersects,
              intersect
            })
          );
          this.targetShape = null;
        }
        this.scene._fire(
          new Event(EVENTS.MOUSEMOVE, {
            originalEvent: evt,
            target: this.scene,
            currentTarget: this.scene,
            pointerId,
            intersects,
            intersect
          })
        );
      }
    }

    // always call preventDefault for desktop events because some browsers
    // try to drag and drop the canvas element
    if (evt.cancelable) {
      evt.preventDefault();
    }
  }

  _mousedown(evt) {
    // workaround for mobile IE to force touch event when unhandled pointer event elevates into a mouse event
    // if (UA.ieMobile) {
    //   return this._touchstart(evt);
    // }
    this.setPointersPositions(evt);
    const pointerId = Util._getFirstPointerId(evt);
    const intersects = this._getIntersectObjects(this.getPointerPosition());
    const intersect = intersects[0] ? intersects[0] : null;
    const shape = intersect ? intersect.object : null;

    // DD.justDragged = false;
    this.listenClickTap = true;

    if (shape && shape.isListening()) {
      this.clickStartShape = shape;
      shape._fireAndBubble(
        new Event(EVENTS.MOUSEDOWN, {
          originalEvent: evt,
          pointerId,
          intersects,
          intersect
        })
      );
    } else {
      this.scene._fire(
        new Event(EVENTS.MOUSEDOWN, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId,
          intersects,
          intersect
        })
      );
    }

    // content event
    // this._fire(CONTENT_MOUSEDOWN, { originalEvent: evt });

    // Do not prevent default behavior, because it will prevent listening events outside of window iframe
    // we used preventDefault for disabling native drag&drop
    // but userSelect = none style will do the trick
    // if (evt.cancelable) {
    //   evt.preventDefault();
    // }
  }

  _mouseup(evt) {
    // workaround for mobile IE to force touch event when unhandled pointer event elevates into a mouse event
    // if (UA.ieMobile) {
    //   return this._touchend(evt);
    // }
    this.setPointersPositions(evt);
    const pointerId = Util._getFirstPointerId(evt);
    const intersects = this._getIntersectObjects(this.getPointerPosition());
    const intersect = intersects[0] ? intersects[0] : null;
    const shape = intersect ? intersect.object : null;
    const clickStartShape = this.clickStartShape;
    const clickEndShape = this.clickEndShape;
    let fireDblClick = false;

    if (this.inDblClickWindow) {
      fireDblClick = true;
      clearTimeout(this.dblTimeout);
      // this.inDblClickWindow = false;
    } else {
      // don't set inDblClickWindow after dragging
      this.inDblClickWindow = true;
      clearTimeout(this.dblTimeout);
    }
    // else if (!DD.justDragged) {
    //   // don't set inDblClickWindow after dragging
    //   this.inDblClickWindow = true;
    //   clearTimeout(this.dblTimeout);
    // }

    this.dblTimeout = setTimeout(() => {
      this.inDblClickWindow = false;
    }, this.dblClickWindow);

    if (shape && shape.isListening()) {
      this.clickEndShape = shape;

      shape._fireAndBubble(
        new Event(EVENTS.MOUSEUP, {
          originalEvent: evt,
          pointerId,
          intersects,
          intersect
        })
      );

      // detect if click or double click occurred
      if (this.listenClickTap && clickStartShape && clickStartShape.id === shape.id) {
        shape._fireAndBubble(
          new Event(EVENTS.CLICK, {
            originalEvent: evt,
            pointerId,
            intersects,
            intersect
          })
        );

        if (fireDblClick && clickEndShape && clickEndShape === shape) {
          shape._fireAndBubble(
            new Event(EVENTS.DBL_CLICK, {
              originalEvent: evt,
              pointerId,
              intersects,
              intersect
            })
          );
        }
      }
    } else {
      this.clickEndShape = null;
      this.scene._fire(
        new Event(EVENTS.MOUSEUP, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId,
          intersects,
          intersect
        })
      );
      if (this.listenClickTap) {
        this.scene._fire(
          new Event(EVENTS.CLICK, {
            originalEvent: evt,
            target: this.scene,
            currentTarget: this.scene,
            pointerId,
            intersects,
            intersect
          })
        );
      }

      if (fireDblClick) {
        this.scene._fire(
          new Event(EVENTS.DBL_CLICK, {
            originalEvent: evt,
            target: this.scene,
            currentTarget: this.scene,
            pointerId,
            intersects,
            intersect
          })
        );
      }
    }
    // content events
    // this.scene._fire(CONTENT_MOUSEUP, { originalEvent: evt });
    // if (this.listenClickTap) {
    //   this.scene._fire(CONTENT_CLICK, { originalEvent: evt });
    //   if (fireDblClick) {
    //     this.scene._fire(CONTENT_DBL_CLICK, { originalEvent: evt });
    //   }
    // }

    this.listenClickTap = false;

    // always call preventDefault for desktop events because some browsers
    // try to drag and drop the canvas element
    if (evt.cancelable) {
      evt.preventDefault();
    }
  }

  _contextmenu(evt) {
    this.setPointersPositions(evt);
    const intersects = this._getIntersectObjects(this.getPointerPosition());
    const intersect = intersects[0] ? intersects[0] : null;
    const shape = intersect ? intersect.object : null;

    if (shape && shape.isListening()) {
      shape._fireAndBubble(
        new Event(EVENTS.CONTEXTMENU, {
          originalEvent: evt,
          intersects,
          intersect
        })
      );
    } else {
      this.scene._fire(
        new Event(EVENTS.CONTEXTMENU, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          intersects,
          intersect
        })
      );
    }
    // this._fire(CONTENT_CONTEXTMENU, { originalEvent: evt });
  }

  _touchstart(evt) {
    this.setPointersPositions(evt);
    let triggeredOnShape = false;
    this._changedPointerPositions.forEach(pos => {
      const intersects = this._getIntersectObjects(pos);
      const intersect = intersects[0] ? intersects[0] : null;
      const shape = intersect ? intersect.object : null;

      this.listenClickTap = true;
      // DD.justDragged = false;
      const hasShape = shape && shape.isListening();

      if (!hasShape) {
        return;
      }

      // if (this.captureTouchEventsEnabled) {
      //   shape.setPointerCapture(pos.id);
      // }

      this.tapStartShape = shape;
      shape._fireAndBubble(
        new Event(EVENTS.TOUCHSTART, {
          originalEvent: evt,
          pointerId: pos.id,
          intersects,
          intersect
        }),
        this
      );
      triggeredOnShape = true;
      // only call preventDefault if the shape is listening for events
      if (shape.isListening() && shape.preventDefault() && evt.cancelable) {
        evt.preventDefault();
      }
    });

    if (!triggeredOnShape) {
      this.scene._fire(
        new Event(EVENTS.TOUCHSTART, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId: this._changedPointerPositions[0].id
        })
      );
    }

    // content event
    // this._fire(CONTENT_TOUCHSTART, { originalEvent: evt });
  }

  _touchmove(evt) {
    this.setPointersPositions(evt);
    let triggeredOnShape = false;
    const processedShapesIds = {};
    this._changedPointerPositions.forEach(pos => {
      const intersects = this._getIntersectObjects(pos);
      const intersect = intersects[0] ? intersects[0] : null;
      const shape = intersect ? intersect.object : null;

      const hasShape = shape && shape.isListening();
      if (!hasShape) {
        return;
      }
      if (processedShapesIds[shape.id]) {
        return;
      }
      processedShapesIds[shape.id] = true;

      shape._fireAndBubble(
        new Event(EVENTS.TOUCHMOVE, {
          originalEvent: evt,
          pointerId: pos.id,
          intersects,
          intersect
        })
      );
      triggeredOnShape = true;
      // only call preventDefault if the shape is listening for events
      if (shape.isListening() && shape.preventDefault() && evt.cancelable) {
        evt.preventDefault();
      }
    });

    if (!triggeredOnShape) {
      this.scene._fire(
        new Event(EVENTS.TOUCHMOVE, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId: this._changedPointerPositions[0].id
        })
      );
    }

    // this._fire(CONTENT_TOUCHMOVE, { originalEvent: evt });
    if (evt.cancelable) {
      evt.preventDefault();
    }
  }

  _touchend(evt) {
    this.setPointersPositions(evt);

    const tapEndShape = this.tapEndShape;
    let fireDblClick = false;

    if (this.inDblClickWindow) {
      fireDblClick = true;
      clearTimeout(this.dblTimeout);
      // this.inDblClickWindow = false;
    } else {
      this.inDblClickWindow = true;
      clearTimeout(this.dblTimeout);
    }

    this.dblTimeout = setTimeout(() => {
      this.inDblClickWindow = false;
    }, this.dblClickWindow);

    let triggeredOnShape = false;
    const processedShapesIds = {};
    let tapTriggered = false;
    let dblTapTriggered = false;

    this._changedPointerPositions.forEach(pos => {
      const intersects = this._getIntersectObjects(pos);
      const intersect = intersects[0] ? intersects[0] : null;
      const shape = intersect ? intersect.object : null;

      // if (shape) {
      //   shape.releaseCapture(pos.id);
      // }

      const hasShape = shape && shape.isListening();
      if (!hasShape) {
        return;
      }
      if (processedShapesIds[shape.id]) {
        return;
      }
      processedShapesIds[shape.id] = true;

      this.tapEndShape = shape;
      shape._fireAndBubble(
        new Event(EVENTS.TOUCHEND, {
          originalEvent: evt,
          pointerId: pos.id,
          intersects,
          intersect
        })
      );
      triggeredOnShape = true;

      // detect if tap or double tap occurred
      if (this.listenClickTap && shape === this.tapStartShape) {
        tapTriggered = true;
        shape._fireAndBubble(
          new Event(EVENTS.TAP, {
            originalEvent: evt,
            pointerId: pos.id,
            intersects,
            intersect
          })
        );

        if (fireDblClick && tapEndShape && tapEndShape === shape) {
          dblTapTriggered = true;
          shape._fireAndBubble(
            new Event(EVENTS.DBL_TAP, {
              originalEvent: evt,
              pointerId: pos.id,
              intersects,
              intersect
            })
          );
        }
      }

      // only call preventDefault if the shape is listening for events
      if (shape.isListening() && shape.preventDefault() && evt.cancelable) {
        evt.preventDefault();
      }
    });

    if (!triggeredOnShape) {
      this.scene._fire(
        new Event(EVENTS.TOUCHEND, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId: this._changedPointerPositions[0].id
        })
      );
    }

    if (this.listenClickTap && !tapTriggered) {
      this.tapEndShape = null;
      this.scene._fire(
        new Event(EVENTS.TAP, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId: this._changedPointerPositions[0].id
        })
      );
    }
    if (fireDblClick && !dblTapTriggered) {
      this.scene._fire(
        new Event(EVENTS.DBL_TAP, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene,
          pointerId: this._changedPointerPositions[0].id
        })
      );
    }
    // content events
    // this._fire(CONTENT_TOUCHEND, { originalEvent: evt });
    // if (this.listenClickTap) {
    //   this._fire(CONTENT_TAP, { originalEvent: evt });
    //   if (fireDblClick) {
    //     this._fire(CONTENT_DBL_TAP, { originalEvent: evt });
    //   }
    // }

    if (evt.cancelable) {
      evt.preventDefault();
    }

    this.listenClickTap = false;
  }

  _wheel(evt) {
    this.setPointersPositions(evt);
    const intersects = this._getIntersectObjects(this.getPointerPosition());
    const intersect = intersects[0] ? intersects[0] : null;
    const shape = intersect ? intersect.object : null;

    if (shape && shape.isListening()) {
      shape._fireAndBubble(
        new Event(EVENTS.WHEEL, {
          originalEvent: evt,
          intersects,
          intersect
        })
      );
    } else {
      this.scene._fire(
        new Event(EVENTS.WHEEL, {
          originalEvent: evt,
          target: this.scene,
          currentTarget: this.scene
        })
      );
    }
    // this._fire(CONTENT_WHEEL, { originalEvent: evt });
  }

  _pointerdown() {}
  _pointermove() {}
  _pointerup() {}
  _pointercancel() {}
  _lostpointercapture() {}

  getPointerPosition() {
    const pos = this._pointerPositions[0] || this._changedPointerPositions[0];
    if (!pos) {
      console.warn("no pointer");
      return null;
    }
    return {
      x: pos.x,
      y: pos.y
    };
  }

  /**
   * 设置鼠标位置
   * @param evt
   */
  setPointersPositions(evt) {
    const contentPosition = this._getContentPosition();
    let x = null;
    let y = null;
    evt = evt || window.event;

    // touch events
    if (evt.touches !== undefined) {
      // touchlist has not support for map method
      // so we have to iterate
      this._pointerPositions = [];
      this._changedPointerPositions = [];
      Util.each(evt.touches, touch => {
        this._pointerPositions.push({
          id: touch.identifier,
          x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
          y: (touch.clientY - contentPosition.top) / contentPosition.scaleY
        });
      });
      Util.each(evt.changedTouches || evt.touches, touch => {
        this._changedPointerPositions.push({
          id: touch.identifier,
          x: (touch.clientX - contentPosition.left) / contentPosition.scaleX,
          y: (touch.clientY - contentPosition.top) / contentPosition.scaleY
        });
      });
    } else {
      // mouse events
      x = (evt.clientX - contentPosition.left) / contentPosition.scaleX;
      y = (evt.clientY - contentPosition.top) / contentPosition.scaleY;
      this._pointerPositions = [{ x, y, id: Util._getFirstPointerId(evt) }];
      this._changedPointerPositions = [{ x, y, id: Util._getFirstPointerId(evt) }];
    }
  }

  _getContentPosition() {
    if (!this.domElement || !this.domElement.getBoundingClientRect) {
      return {
        top: 0,
        left: 0,
        scaleX: 1,
        scaleY: 1
      };
    }

    const rect = this.domElement.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      // sometimes clientWidth can be equals to 0
      // looks like it is because of hidden testing element
      scaleX: rect.width / this.domElement.clientWidth || 1,
      scaleY: rect.height / this.domElement.clientHeight || 1
    };
  }

  getIntersection(pos, objects) {
    const intersect = this._getIntersectObjects(pos, objects)[0];
    return intersect ? intersect.object : null;
  }

  getIntersectObject(pos, objects, recursive) {
    const intersect = this._getIntersectObjects(pos, objects, recursive)[0];
    return intersect || null;
  }

  getIntersectObjects(pos, objects = [], recursive = true) {
    this.mouse.set(
      (pos.x / this.domElement.offsetWidth) * 2 - 1,
      -(pos.y / this.domElement.offsetHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // 过滤不可见图层
    const allowObjects = [];
    const layers = this.camera.layers;
    objects.forEach(child => {
      if (recursive) {
        child.traverseVisible(object => {
          if (object.layers.test(layers)) allowObjects.push(object);
        });
      } else {
        if (child.layers.test(layers)) allowObjects.push(child);
      }
    });

    // 射线检测
    return this.raycaster.intersectObjects(allowObjects, false);
  }

  /**
   * 射线检测(内部使用)
   */
  _getIntersectObjects(pos) {
    if (this.type === "gpu") {
      this.mouse.set(pos.x, pos.y);
      // interpret the pixel as an ID

      const id = (this.pixelBuffer[0] << 16) | (this.pixelBuffer[1] << 8) | this.pixelBuffer[2];

      const object = this.pickingData[id];
      if (object) {
        this.intersects = [{ object }];
      } else {
        this.intersects = [];
      }
    } else {
      this.mouse.set(
        (pos.x / this.domElement.offsetWidth) * 2 - 1,
        -(pos.y / this.domElement.offsetHeight) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.intersects = [];
      this.raycaster.intersectObjects(this.objects, false, this.intersects);
    }
    return this.intersects;
  }

  /**
   * 更新检测对象
   */
  update() {
    // console.time("update");
    const currentRenderList = this.renderer.renderLists.get(this.scene, this.camera);
    const opaqueObjects = currentRenderList.opaque;
    const transparentObjects = currentRenderList.transparent;

    const objects = [];

    if (opaqueObjects.length > 0) this.updateObjects(objects, opaqueObjects, this.camera);
    if (transparentObjects.length > 0) this.updateObjects(objects, transparentObjects, this.camera);

    this.objects = objects;
    // console.timeEnd("update");

    // gpu
    if (this.type === "gpu") {
      this.pickingData = [];
      this.materialList.forEach(function (m) {
        m.dispose();
      });
      this.materialList = [];
      this.pickingScene = new Scene();
      for (let i = 0, length = objects.length; i < length; i++) {
        const object = objects[i];
        const pickingObject = object.clone();
        pickingObject.material = this.pickingMaterial.clone();
        pickingObject.material.color.setHex(i + 1);

        this.materialList.push(pickingObject.material);
        this.pickingData[i + 1] = object;
        this.pickingScene.add(pickingObject);
      }

      this.renderer.setRenderTarget(this.pickingRenderTarget);
      this.renderer.render(this.pickingScene, this.camera);
      // read the pixel under the mouse from the texture

      this.renderer.readRenderTargetPixels(
        this.pickingRenderTarget,
        this.mouse.x,
        this.pickingRenderTarget.height - this.mouse.y,
        1,
        1,
        this.pixelBuffer
      );
      this.renderer.setRenderTarget(null);
    }
  }

  updateObjects(objects, renderList, camera) {
    for (let i = 0, len = renderList.length; i < len; i++) {
      const renderItem = renderList[i];

      const object = renderItem.object;
      if (object.visible && object.layers.test(camera.layers) && object.isListening()) {
        objects.push(object);
      }
    }
  }

  dispose() {
    this.destroy();
  }

  destroy() {
    const length = registerEvents.length;
    for (let i = 0; i < length; i++) {
      const type = registerEvents[i];
      removeEvent(this, type);
    }
    this._listeners = {};
  }

  _bindContentEvents() {
    this._listeners = {};
    const length = registerEvents.length;
    for (let i = 0; i < length; i++) {
      const type = registerEvents[i];
      this._listeners[type] = this["_" + type].bind(this);
      addEvent(this, type);
    }
  }
}

export { EventSystem };
