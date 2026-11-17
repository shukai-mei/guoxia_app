<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import { getFaq, getWechatConfig } from '../../api'
import type { FaqItem, WechatConfig } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { copyText } from '../../utils/clipboard'

const loading = ref(true)
const errorText = ref('')
const faqItems = ref<FaqItem[]>([])
const wechat = ref<WechatConfig | null>(null)
const expandedIndex = ref<number | null>(null)

async function load() {
  loading.value = true
  errorText.value = ''
  const [faqResult, wechatResult] = await Promise.allSettled([
    getFaq(),
    getWechatConfig()
  ])
  if (faqResult.status === 'fulfilled') {
    faqItems.value = faqResult.value.items
    expandedIndex.value = faqItems.value.length > 0 ? 0 : null
  } else {
    faqItems.value = []
    errorText.value = errorMessageOf(faqResult.reason)
  }
  if (wechatResult.status === 'fulfilled') {
    const config = wechatResult.value
    wechat.value = config.contact || config.qrUrl ? config : null
  } else {
    wechat.value = null
  }
  loading.value = false
}

function toggleFaq(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
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

async function onCopyWechat() {
  const contact = wechat.value?.contact
  if (!contact) {
    return
  }
  const ok = await copyText(contact)
  if (ok) {
    showSuccessToast('微信号已复制')
  } else {
    selectFallback(contact)
    showToast('复制失败，请手动复制微信号')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="咨询" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block">加载中...</van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <template v-else>
          <div class="sec">常见咨询问题</div>

          <van-empty v-if="faqItems.length === 0" description="暂无常见问题" />

          <div
            v-for="(item, index) in faqItems"
            :key="index"
            class="faq"
            :class="{ open: expandedIndex === index }"
          >
            <div class="q" @click="toggleFaq(index)">
              <span class="qi">问</span>
              <span class="qt">{{ item.question }}</span>
              <van-icon class="arr" name="arrow-down" />
            </div>
            <div class="a">{{ item.answer }}</div>
          </div>

          <template v-if="wechat">
            <div class="sec">管家联系方式</div>
            <div class="contact">
              <div class="av">
                <van-icon name="manager-o" />
              </div>
              <div class="ci">
                <div class="cn">
                  看房管家<span class="online">在线</span>
                </div>
                <div v-if="wechat.contact" class="cw">
                  客服微信号：{{ wechat.contact }}
                </div>
              </div>
            </div>
            <button
              v-if="wechat.contact"
              class="copy-btn"
              type="button"
              @click="onCopyWechat"
            >
              复制微信号
            </button>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.sec {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  margin: 14px 2px 8px;
}

.faq {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.faq .q {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
}

.faq .q .qi {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.faq .q .qt {
  flex: 1;
}

.faq .q .arr {
  color: var(--hint);
  font-size: 12px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.faq.open .q .arr {
  transform: rotate(180deg);
}

.faq .a {
  display: none;
  padding: 0 14px 13px 40px;
  font-size: 12px;
  color: var(--sub);
  line-height: 1.6;
}

.faq.open .a {
  display: block;
}

.contact {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 12px;
  padding: 14px;
}

.contact .av {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.contact .ci {
  flex: 1;
}

.contact .cn {
  font-size: 14px;
  font-weight: 600;
}

.contact .online {
  font-size: 11px;
  color: #2d5f3f;
  background: #eaf3ee;
  border-radius: 6px;
  padding: 1px 6px;
  margin-left: 4px;
}

.contact .cw {
  font-size: 12px;
  color: var(--muted);
  margin-top: 3px;
}

.copy-btn {
  display: block;
  width: 100%;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
}
</style>
