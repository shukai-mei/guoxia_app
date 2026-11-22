// jsdom does not implement layout: offsetParent is always null, which makes
// vant's isHidden() treat every element as hidden and van-list never emits load.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get() {
    return this.parentElement ?? document.body
  }
})

// vant's nav-bar/action-bar/tabbar/submit-bar schedule height-measure timers
// (100/200/300ms) on mount without cleanup; a fast-finishing test file leaks
// them past jsdom teardown, where the deleted `window` global makes them throw.
// A prototype fallback keeps bare `window` lookups resolvable so late callbacks
// measure detached nodes harmlessly instead of crashing the run.
Object.setPrototypeOf(
  globalThis,
  Object.create(Object.getPrototypeOf(globalThis), {
    window: { value: {}, writable: false }
  })
)
