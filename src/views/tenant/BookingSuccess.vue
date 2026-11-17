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

const addressText = computed(
  () => property.value?.building?.address ?? property.value?.location ?? ''
)

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

function goMyAppointments() {
  router.push('/my-appointments')
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="预约成功" left-arrow @click-left="goBack" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block">加载中...</van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="goBack">返回</van-button>
        </van-empty>

        <template v-else>
          <div class="success-card">
            <div class="success-head">
              <div class="success-check">
                <van-icon name="passed" />
              </div>
              <div class="success-title">预约成功</div>
              <div class="success-sub">请按时前往看房，祝您看房顺利</div>
            </div>
            <div class="success-info">
              <div class="si">
                <span class="k">看房时间</span>
                <span class="v">{{ timeText }}</span>
              </div>
              <div v-if="property" class="si">
                <span class="k">房源</span>
                <span class="v">{{ property.title }}</span>
              </div>
              <div class="si">
                <span class="k">地址</span>
                <span class="v">{{ addressText }}</span>
              </div>
            </div>
            <van-button
              round
              block
              type="primary"
              class="my-appointments-btn"
              @click="goMyAppointments"
            >
              查看我的预约
            </van-button>
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
              <div class="wechat-hint">
                请提前添加客服微信，预约时间段内可在我的预约中自助开启楼栋门禁、查看房门密码
              </div>
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
  border: 0.5px solid var(--line);
  border-radius: 14px;
  padding: 8px 16px 20px;
}

.success-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 26px 0 22px;
}

.success-check {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(245, 124, 42, 0.28);
  margin-bottom: 16px;
}

.success-check :deep(.van-icon) {
  font-size: 32px;
}

.success-title {
  font-size: 20px;
  font-weight: 600;
}

.success-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 6px;
}

.success-info {
  background: var(--brand-light);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
}

.si {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
}

.si .k {
  color: var(--muted);
  flex-shrink: 0;
}

.si .v {
  color: var(--ink);
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.my-appointments-btn {
  margin-top: 12px;
}

.detail-card {
  background: #fff;
  border: 0.5px solid var(--line);
  border-radius: 14px;
  padding: 16px;
}

.wechat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.wechat-qr {
  background: #f2f3f5;
}

.wechat-contact {
  font-size: 14px;
  color: var(--ink);
}

.wechat-hint {
  font-size: 12px;
  color: var(--muted);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.closing-tip {
  margin: 16px;
  padding: 10px 12px;
  border: 0.5px solid #f6dfc4;
  border-radius: 12px;
  background: #fff7ee;
  color: var(--brand-strong);
  font-size: 12px;
  text-align: center;
}
</style>
