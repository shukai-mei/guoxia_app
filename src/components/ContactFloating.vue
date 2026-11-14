<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon as VanIcon, showToast } from 'vant'
import { getWechatConfig } from '../api'
import type { WechatConfig } from '../api/types'

const expanded = ref(false)
const config = ref<WechatConfig | null>(null)
const floatingRef = ref<HTMLElement | null>(null)
const position = ref<{ left: number; top: number } | null>(null)

const DRAG_THRESHOLD = 5
let pointerId: number | null = null
let originLeft = 0
let originTop = 0
let startX = 0
let startY = 0
let moved = false
let suppressClick = false

onMounted(async () => {
  try {
    config.value = await getWechatConfig()
  } catch {
    // 配置加载失败时保持隐藏，不影响页面功能
  }
})

function hasContact(): boolean {
  const value = config.value
  return value != null && (value.qrUrl != null || value.contact != null)
}

function toggle() {
  expanded.value = !expanded.value
}

function onPointerDown(event: PointerEvent) {
  if (pointerId !== null) {
    return
  }
  const el = floatingRef.value
  if (!el) {
    return
  }
  const rect = el.getBoundingClientRect()
  originLeft = rect.left
  originTop = rect.top
  startX = event.clientX
  startY = event.clientY
  moved = false
  pointerId = event.pointerId
  position.value = { left: rect.left, top: rect.top }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (pointerId !== event.pointerId) {
    return
  }
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
    return
  }
  moved = true
  const el = floatingRef.value
  position.value = {
    left: Math.min(Math.max(originLeft + dx, 0), window.innerWidth - (el?.offsetWidth ?? 0)),
    top: Math.min(Math.max(originTop + dy, 0), window.innerHeight - (el?.offsetHeight ?? 0))
  }
}

function onPointerUp(event: PointerEvent) {
  if (pointerId !== event.pointerId) {
    return
  }
  pointerId = null
  const wasDragged = moved
  moved = false
  suppressClick = true
  if (!wasDragged) {
    toggle()
  }
}

function onClickBubble() {
  if (suppressClick) {
    suppressClick = false
    return
  }
  toggle()
}

function selectFallback(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  window.setTimeout(() => el.remove(), 3000)
}

async function onCopyContact() {
  const text = config.value?.contact
  if (!text) {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    showToast('微信号已复制')
  } catch {
    selectFallback(text)
    showToast('复制失败，请手动复制')
  }
}
</script>

<template>
  <div
    v-if="hasContact()"
    ref="floatingRef"
    class="contact-floating"
    :style="
      position
        ? { left: `${position.left}px`, top: `${position.top}px`, right: 'auto', bottom: 'auto' }
        : undefined
    "
  >
    <div v-if="expanded" class="contact-panel">
      <div class="contact-panel-head">
        <span class="contact-title">联系管家</span>
        <span class="contact-collapse" @click="toggle">收起</span>
      </div>
      <img
        v-if="config?.qrUrl"
        class="contact-qr"
        :src="config.qrUrl"
        alt="管家企业微信二维码"
      />
      <div v-if="config?.contact" class="contact-row">
        <span class="contact-label">微信号：{{ config.contact }}</span>
        <span class="contact-copy" @click="onCopyContact">复制</span>
      </div>
    </div>
    <button
      class="contact-bubble"
      type="button"
      @click="onClickBubble"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="contact-bubble-ic"><VanIcon name="wap-home-o" /></span>
      <span class="contact-bubble-text">
        <span class="contact-bubble-title">联系管家</span>
        <span class="contact-bubble-sub">看房问题 一键咨询</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.contact-floating {
  position: fixed;
  right: 16px;
  bottom: 48px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.contact-panel {
  width: 200px;
  margin-bottom: 10px;
  padding: 12px;
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
}

.contact-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.contact-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.contact-collapse {
  font-size: 12px;
  color: var(--muted);
}

.contact-qr {
  display: block;
  width: 100%;
  border-radius: 6px;
}

.contact-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contact-label {
  font-size: 12px;
  color: var(--sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-copy {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--brand);
}

.contact-bubble {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px 7px 7px;
  border: 0.5px solid var(--line);
  border-radius: 22px;
  background: #fff;
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.contact-bubble-ic {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  flex-shrink: 0;
}

.contact-bubble-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.contact-bubble-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
}

.contact-bubble-sub {
  font-size: 10px;
  line-height: 1.3;
  color: var(--muted);
}
</style>
