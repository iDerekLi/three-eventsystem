# three.eventsystem

ThreeJS 事件监听器

```javascript
import { EventSystem } from "three-eventsystem";

// 添加事件监听器
const eventSystem = new EventSystem(scene, camera, renderer);
// 销毁事件监听器
eventSystem.destroy();

// 发布订阅事件
// 支持 scene、group、mesh、object3d 事件绑定
scene.on("mouseenter", e => log(e));
scene.on("mouseover", e => log(e));
scene.on("mousemove", e => log(e));
scene.on("mouseout", e => log(e));
scene.on("mouseleave", e => log(e));
scene.on("mousedown", e => log(e));
scene.on("mouseup", e => log(e));
scene.on("click", e => log(e));
scene.on("dblclick", e => log(e));
scene.on("contextmenu", e => log(e));
scene.on("touchstart", e => log(e));
scene.on("touchmove", e => log(e));
scene.on("touchend", e => log(e));
scene.on("tap", e => log(e));
scene.on("dbltap", e => log(e));
scene.on("wheel", e => log(e));
// 移除事件
scene.off("click", e => log(e));

// 临时失去激活事件监听
scene.listening = false; // 失去
scene.listening = true; // 激活
```


