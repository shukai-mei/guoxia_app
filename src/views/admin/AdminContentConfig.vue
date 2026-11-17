<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import {
  adminGetFaq,
  adminGetViewingRules,
  adminUpdateFaq,
  adminUpdateViewingRules
} from '../../api'
import type { FaqItem } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const faqText = ref('')
const rulesText = ref('')

const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [faq, rules] = await Promise.all([
      adminGetFaq(),
      adminGetViewingRules()
    ])
    faqText.value = faq.items
      .map((item) => `${item.question} | ${item.answer}`)
      .join('\n')
    rulesText.value = rules.items.join('\n')
  } catch (error) {
    loadError.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

function parseFaqLines(text: string): { items: FaqItem[]; error: string } {
  const items: FaqItem[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      continue
    }
    const sep = trimmed.indexOf('|')
    if (sep === -1) {
      return { items: [], error: `第 ${i + 1} 行缺少「|」分隔符` }
    }
    const question = trimmed.slice(0, sep).trim()
    const answer = trimmed.slice(sep + 1).trim()
    if (!question || !answer) {
      return { items: [], error: `第 ${i + 1} 行问题或答案不能为空` }
    }
    items.push({ question, answer })
  }
  return { items, error: '' }
}

function parseRulesLines(text: string): { items: string[]; error: string } {
  const items: string[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      return { items: [], error: `第 ${i + 1} 行不能为空` }
    }
    items.push(trimmed)
  }
  return { items, error: '' }
}

async function onSubmit() {
  if (submitting.value) {
    return
  }
  const faqResult = parseFaqLines(faqText.value)
  if (faqResult.error) {
    showToast(faqResult.error)
    return
  }
  const rulesResult = parseRulesLines(rulesText.value)
  if (rulesResult.error) {
    showToast(rulesResult.error)
    return
  }
  submitting.value = true
  try {
    await adminUpdateFaq({ items: faqResult.items })
    await adminUpdateViewingRules({ items: rulesResult.items })
    showSuccessToast('保存成功')
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="咨询内容配置" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="loadError" image="error" :description="loadError">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <template v-else>
          <div class="section-card">
            <div class="section-title">常见咨询问题</div>
            <div class="section-hint">每行一条，格式：问题 | 答案（按第一个 | 切分）</div>
            <van-field
              v-model="faqText"
              type="textarea"
              rows="8"
              placeholder="例如：如何预约看房？ | 在房源详情页填写信息后提交即可"
            />
          </div>

          <div class="section-card">
            <div class="section-title">看房规则须知</div>
            <div class="section-hint">每行一条，展示在「我的预约」页面顶部</div>
            <van-field
              v-model="rulesText"
              type="textarea"
              rows="4"
              placeholder="例如：看房期间请勿破坏房内设施"
            />
          </div>

          <div class="submit-wrap">
            <van-button
              round
              block
              type="primary"
              :loading="submitting"
              @click="onSubmit"
            >
              保存内容
            </van-button>
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

.section-card {
  background: #fff;
  border-radius: 8px;
  margin: 12px 16px 0;
  padding: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
}

.section-hint {
  margin: 4px 0 8px;
  font-size: 12px;
  color: #969799;
}

.submit-wrap {
  padding: 16px;
}
</style>
