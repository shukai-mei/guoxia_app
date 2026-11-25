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
