<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getFaq } from '../../api'
import type { FaqItem } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const loading = ref(true)
const errorText = ref('')
const faqItems = ref<FaqItem[]>([])
const expandedIndex = ref<number | null>(null)

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const faqResult = await getFaq()
    faqItems.value = faqResult.items
    expandedIndex.value = faqItems.value.length > 0 ? 0 : null
  } catch (error) {
    faqItems.value = []
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

function toggleFaq(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="咨询" />

    <div class="page">
      <div class="page-content">
        <div class="ai-teaser">
          <span class="ai-badge"><span class="dot"></span>即将上线 · AI 管家</span>
          <div class="ai-head">
            <div class="ai-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" /></svg>
            </div>
            <div>
              <div class="ai-name">智能管家小悦</div>
              <div class="ai-sub">AI Agent · 7×24 小时在线解答</div>
            </div>
          </div>
          <div class="ai-desc">即将上线的 AI 智能管家，可提供看房咨询、为你推荐合适房源，无需等待人工管家。</div>
          <div class="ai-feats">
            <span class="ai-feat">看房咨询</span>
            <span class="ai-feat">房源推荐</span>
          </div>
          <div class="ai-cta disabled">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M9 13l2 2 4-4" /></svg>
            敬请期待
          </div>
        </div>

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
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-teaser {
  background: linear-gradient(135deg, #fff7ee, #fef0e3);
  border: 0.5px solid #f6dfc4;
  border-radius: 14px;
  padding: 16px 14px;
  margin-bottom: 14px;
  position: relative;
  overflow: hidden;
}

.ai-teaser::after {
  content: '';
  position: absolute;
  right: -20px;
  top: -20px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: rgba(245, 124, 42, 0.08);
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: var(--brand);
  border-radius: 20px;
  padding: 2px 9px;
}

.ai-badge .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  animation: ai-blink 1.4s infinite;
}

@keyframes ai-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.ai-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f57c2a, #ff8a3d);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(245, 124, 42, 0.3);
  position: relative;
}

.ai-avatar svg {
  width: 28px;
  height: 28px;
}

.ai-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.ai-sub {
  font-size: 11px;
  color: var(--brand-strong);
  margin-top: 3px;
}

.ai-desc {
  font-size: 12px;
  color: var(--sub);
  line-height: 1.7;
  margin-top: 12px;
}

.ai-feats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.ai-feat {
  font-size: 11px;
  color: var(--brand-strong);
  background: #fff;
  border: 0.5px solid #f6dfc4;
  border-radius: 16px;
  padding: 4px 10px;
}

.ai-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  background: var(--brand);
  color: #fff;
  border-radius: 12px;
  padding: 11px;
  font-size: 13px;
  font-weight: 500;
}

.ai-cta svg {
  width: 15px;
  height: 15px;
}

.ai-cta.disabled {
  background: #e9e4dc;
  color: var(--muted);
}

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
</style>
