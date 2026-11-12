<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import { adminGetWechatConfig, adminUpdateWechatConfig } from '../../api'
import type { WechatConfigInput } from '../../api/types'
import MediaUploader, { type UploadedMedia } from '../../components/MediaUploader.vue'
import { errorMessageOf } from '../../utils/error'

const contact = ref('')
const qrMedia = ref<UploadedMedia[]>([])

const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const config = await adminGetWechatConfig()
    contact.value = config.contact ?? ''
    if (config.qrObjectKey && config.qrUrl) {
      qrMedia.value = [
        { type: 'SURROUNDING', key: config.qrObjectKey, url: config.qrUrl, sortOrder: 0 }
      ]
    } else {
      qrMedia.value = []
    }
  } catch (error) {
    loadError.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!contact.value.trim()) {
    showToast('请填写客服微信号')
    return
  }
  const input: WechatConfigInput = { contact: contact.value.trim() }
  const qr = qrMedia.value[0]
  if (qr) {
    input.qrObjectKey = qr.key
  }
  submitting.value = true
  try {
    await adminUpdateWechatConfig(input)
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
    <van-nav-bar title="企微客服配置" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading" class="state-block" color="#1989fa">加载中...</van-loading>

        <van-empty v-else-if="loadError" image="error" :description="loadError">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <template v-else>
          <van-cell-group inset>
            <van-field
              v-model="contact"
              label="客服微信号"
              placeholder="请输入客服微信号"
            />
          </van-cell-group>

          <div class="qr-section">
            <MediaUploader v-model="qrMedia" type="SURROUNDING" label="客服二维码" :max="1" />
            <div class="qr-hint">租客预约成功后将在引导页看到该二维码，用于添加客服微信</div>
          </div>

          <div class="submit-wrap">
            <van-button round block type="primary" :loading="submitting" @click="onSubmit">
              保存配置
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

.qr-section {
  background: #fff;
  border-radius: 8px;
  margin: 12px 16px 0;
  padding: 12px;
}

.qr-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
}

.submit-wrap {
  padding: 16px;
}
</style>
