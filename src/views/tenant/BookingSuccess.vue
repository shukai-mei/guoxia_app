<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showImagePreview } from 'vant'
import { getProperty, getWechatConfig } from '../../api'
import type { Property, WechatConfig } from '../../api/types'
import { errorMessageOf } from '../../utils/error'

const route = useRoute()
const router = useRouter()

const propertyId = route.query.propertyId as string | undefined
const date = route.query.date as string | undefined
const slotStart = route.query.slotStart as string | undefined
const slotEnd = route.query.slotEnd as string | undefined

const loading = ref(true)
const errorText = ref('')
const property = ref<Property | null>(null)
const wechat = ref<WechatConfig | null>(null)

const validParams = computed(
  () => Boolean(propertyId && date && slotStart && slotEnd)
)

const addressMedia = computed(() =>
  [...(property.value?.building?.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
)

const timeText = computed(() => `${date} ${slotStart}~${slotEnd}`)

async function load() {
  if (!validParams.value) {
    loading.value = false
    errorText.value = '预约信息缺失，请返回房源重新预约'
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const [propertyResult, wechatResult] = await Promise.all([
      getProperty(propertyId as string),
      getWechatConfig()
    ])
    property.value = propertyResult
    wechat.value = wechatResult
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

function previewAddressImages(startIndex: number) {
  showImagePreview({ images: addressMedia.value.map((item) => item.url), startPosition: startIndex })
}

function goBack() {
  router.back()
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="预约成功" left-arrow @click-left="goBack" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block" color="#1989fa">加载中...</van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="goBack">返回</van-button>
        </van-empty>

        <template v-else>
          <div class="success-card">
            <van-icon name="passed" class="success-icon" color="#07c160" />
            <div class="success-title">预约成功</div>
            <div class="success-time">看房时间：{{ timeText }}</div>
            <div v-if="property" class="success-property">房源：{{ property.title }}</div>
          </div>

          <template v-if="wechat && (wechat.qrUrl || wechat.contact)">
            <div class="section-title">提前添加客服微信</div>
            <div class="detail-card wechat-card">
              <van-image
                v-if="wechat.qrUrl"
                :src="wechat.qrUrl"
                width="160px"
                height="160px"
                fit="cover"
                radius="6"
                class="wechat-qr"
              />
              <div v-if="wechat.contact" class="wechat-contact">
                客服微信号：{{ wechat.contact }}
              </div>
              <div class="wechat-hint">请提前添加客服微信，到楼后联系客服远程开门禁</div>
            </div>
          </template>

          <template v-if="addressMedia.length > 0">
            <div class="section-title">到楼指引（地址参考图）</div>
            <div class="media-grid">
              <van-image
                v-for="(item, index) in addressMedia"
                :key="item.key"
                :src="item.url"
                width="100%"
                height="96px"
                fit="cover"
                radius="6"
                @click="previewAddressImages(index)"
              />
            </div>
          </template>

          <div class="closing-tip">
            看完房后请关好房门，如遇问题请联系客服
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

.success-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.success-icon {
  font-size: 48px;
}

.success-title {
  font-size: 18px;
  font-weight: 600;
}

.success-time {
  font-size: 14px;
  color: #323233;
}

.success-property {
  font-size: 13px;
  color: #646566;
}

.detail-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.wechat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.wechat-qr {
  background: #f7f8fa;
}

.wechat-contact {
  font-size: 14px;
  color: #323233;
}

.wechat-hint {
  font-size: 12px;
  color: #969799;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.closing-tip {
  margin: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #fffbe8;
  color: #ed6a0c;
  font-size: 13px;
  text-align: center;
}
</style>
