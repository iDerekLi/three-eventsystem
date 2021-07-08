export default {
  _getFirstPointerId(evt) {
    if (!evt.touches) {
      // fake id for mouse
      return 999;
    } else {
      return evt.changedTouches[0].identifier;
    }
  },
  each(arr, func) {
    for (let i = 0; i < arr.length; i++) {
      func(arr[i], i);
    }
  }
};

export function isUndefined(obj) {
  return obj === undefined || obj === null;
}
