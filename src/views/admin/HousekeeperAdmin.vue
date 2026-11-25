<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showConfirmDialog, showSuccessToast, showToast } from 'vant'
import {
  createHousekeeper,
  deleteHousekeeper,
  listHousekeepers,
  updateHousekeeper
} from '../../api'
import type { Housekeeper, HousekeeperInput } from '../../api/types'
import MediaUploader, { type UploadedMedia } from '../../components/MediaUploader.vue'
import { errorMessageOf } from '../../utils/error'

const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')
const housekeepers = ref<Housekeeper[]>([])

const formShow = ref(false)
const editingId = ref<number | null>(null)
const formName = ref('')
const formContact = ref('')
const qrMedia = ref<UploadedMedia[]>([])
const submitting = ref(false)

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    housekeepers.value = await listHousekeepers()
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  formName.value = ''
  formContact.value = ''
  qrMedia.value = []
  formShow.value = true
}

function openEdit(housekeeper: Housekeeper) {
  editingId.value = housekeeper.id
  formName.value = housekeeper.name
  formContact.value = housekeeper.contact
  qrMedia.value =
    housekeeper.qrObjectKey && housekeeper.qrUrl
      ? [
          {
            type: 'SURROUNDING',
            key: housekeeper.qrObjectKey,
            url: housekeeper.qrUrl,
            sortOrder: 0
          }
        ]
      : []
  formShow.value = true
}

function validate(): string | null {
  if (!formName.value.trim()) {
    return '请填写管家名称'
  }
  if (!formContact.value.trim()) {
    return '请填写管家微信号'
  }
  return null
}

function buildInput(): HousekeeperInput {
  const input: HousekeeperInput = {
    name: formName.value.trim(),
    contact: formContact.value.trim()
  }
  const qr = qrMedia.value[0]
  if (qr) {
    input.qrObjectKey = qr.key
  }
  return input
}

async function onSubmit() {
  const error = validate()
  if (error) {
    showToast(error)
    return
  }
  submitting.value = true
  try {
    if (editingId.value === null) {
      await createHousekeeper(buildInput())
    } else {
      await updateHousekeeper(editingId.value, buildInput())
    }
    showSuccessToast('保存成功')
    formShow.value = false
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    submitting.value = false
  }
}

async function onDelete(housekeeper: Housekeeper) {
  try {
    await showConfirmDialog({
      title: '删除管家',
      message: `确认删除「${housekeeper.name}」吗？`
    })
  } catch {
    return
  }
  try {
    await deleteHousekeeper(housekeeper.id)
    showSuccessToast('删除成功')
    load()
  } catch (error) {
    showToast(errorMessageOf(error))
  }
}

onMounted(load)
</script>

<template>
  <div>
    <van-nav-bar title="管家管理" right-text="新建" @click-right="openCreate" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="load">重试</van-button>
        </van-empty>

        <van-empty v-else-if="loaded && housekeepers.length === 0" description="暂无管家">
          <van-button size="small" type="primary" @click="openCreate">新建管家</van-button>
        </van-empty>

        <div v-else class="housekeeper-list">
          <div v-for="housekeeper in housekeepers" :key="housekeeper.id" class="admin-card">
            <div class="admin-card-header">
              <span class="admin-card-title">{{ housekeeper.name }}</span>
              <van-image
                v-if="housekeeper.qrUrl"
                :src="housekeeper.qrUrl"
                width="40px"
                height="40px"
                fit="cover"
                radius="4"
                class="qr-thumb"
              />
            </div>
            <div class="admin-card-desc">微信号：{{ housekeeper.contact }}</div>
            <div class="admin-card-actions">
              <van-button size="small" plain type="primary" @click="openEdit(housekeeper)">
                编辑
              </van-button>
              <van-button size="small" plain type="danger" @click="onDelete(housekeeper)">
                删除
              </van-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-popup v-model:show="formShow" position="bottom" round class="form-popup">
      <div class="form-title">{{ editingId === null ? '新建管家' : '编辑管家' }}</div>
      <van-cell-group inset>
        <van-field
          v-model="formName"
          label="名称"
          placeholder="请输入管家名称"
        />
        <van-field
          v-model="formContact"
          label="微信号"
          placeholder="请输入管家微信号"
        />
      </van-cell-group>

      <div class="qr-section">
        <MediaUploader v-model="qrMedia" type="SURROUNDING" label="管家二维码（选填）" :max="1" />
      </div>

      <div class="form-actions">
        <van-button round block plain @click="formShow = false">取消</van-button>
        <van-button round block type="primary" :loading="submitting" @click="onSubmit">
          保存
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.housekeeper-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.admin-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.admin-card-title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-thumb {
  flex-shrink: 0;
}

.admin-card-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #646566;
}

.admin-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.form-popup {
  padding-bottom: 24px;
}

.form-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding: 16px 0 8px;
}

.qr-section {
  background: #fff;
  border-radius: 8px;
  margin: 12px 16px 0;
  padding: 12px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}
</style>
