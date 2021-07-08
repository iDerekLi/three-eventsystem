import { isUndefined } from "./Util";

class Event {
  constructor(type, eventInit = {}) {
    this.type = type;
    this.originalEvent = null;
    this.currentTarget = null;
    this.target = null;
    this.pointerId = null;
    this.intersects = [];
    this.intersect = null;
    this.distance = 0;
    this.point = null;
    this.timeStamp = 0;

    if (!isUndefined(eventInit.pointerId)) {
      this.pointerId = eventInit.pointerId;
    }
    if (!isUndefined(eventInit.currentTarget)) {
      this.currentTarget = eventInit.currentTarget;
    }
    if (!isUndefined(eventInit.target)) {
      this.target = eventInit.target;
    }
    if (!isUndefined(eventInit.intersects)) {
      this.intersects = eventInit.intersects;
    }
    if (!isUndefined(eventInit.intersect)) {
      const intersect = eventInit.intersect;
      this.intersect = intersect;
      this.distance = intersect.distance;
      this.point = intersect.point;
    }
    if (!isUndefined(eventInit.originalEvent)) {
      const event = eventInit.originalEvent;
      this.originalEvent = event;
      this.timeStamp = event.timeStamp;
    }
  }
}

export default Event;
