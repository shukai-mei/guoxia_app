<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import { adminListProperties, getDailyPassword, upsertDailyPassword } from '../../api'
import type { Property } from '../../api/types'
import { errorMessageOf } from '../../utils/error'
import { toDateString } from '../../utils/format'

const properties = ref<Property[]>([])
const loading = ref(false)
const loaded = ref(false)
const errorText = ref('')

const propertyId = ref<number | null>(null)
const propertyPickerShow = ref(false)

const date = ref(toDateString(new Date()))
const datePickerShow = ref(false)
const pickedDate = ref<string[]>([])

const password = ref('')
const statusLoading = ref(false)
const passwordSet = ref(false)
const statusError = ref('')
const submitting = ref(false)

const selectedProperty = computed(
  () => properties.value.find((p) => p.id === propertyId.value) ?? null
)
const propertyOptions = computed(() =>
  properties.value.map((p) => ({ ...p, className: 'property-column' }))
)

function pad2(value: string): string {
  return value.padStart(2, '0')
}

async function loadProperties() {
  loading.value = true
  errorText.value = ''
  try {
    properties.value = await adminListProperties()
    loaded.value = true
  } catch (error) {
    errorText.value = errorMessageOf(error)
  } finally {
    loading.value = false
  }
}

async function loadStatus() {
  if (propertyId.value === null || !date.value) {
    return
  }
  statusLoading.value = true
  statusError.value = ''
  passwordSet.value = false
  try {
    const result = await getDailyPassword(propertyId.value, date.value)
    passwordSet.value = result.passwordSet
  } catch (error) {
    statusError.value = errorMessageOf(error)
  } finally {
    statusLoading.value = false
  }
}

function onPropertyConfirm({ selectedValues }: { selectedValues: Array<string | number> }) {
  const next = (selectedValues[0] as number | null) ?? null
  propertyPickerShow.value = false
  if (next !== propertyId.value) {
    propertyId.value = next
    loadStatus()
  }
}

function openDatePicker() {
  pickedDate.value = date.value ? date.value.split('-') : toDateString(new Date()).split('-')
  datePickerShow.value = true
}

function onDateConfirm() {
  const [year, month, day] = pickedDate.value
  if (year && month && day) {
    date.value = `${year}-${pad2(month)}-${pad2(day)}`
    loadStatus()
  }
  datePickerShow.value = false
}

async function onSubmit() {
  if (propertyId.value === null) {
    showToast('请选择房源')
    return
  }
  if (!password.value.trim()) {
    showToast('请填写临时密码')
    return
  }
  submitting.value = true
  try {
    await upsertDailyPassword(propertyId.value, {
      date: date.value,
      password: password.value.trim()
    })
    showSuccessToast('设置成功')
    password.value = ''
    loadStatus()
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    submitting.value = false
  }
}

onMounted(loadProperties)
</script>

<template>
  <div>
    <van-nav-bar title="每日密码" />

    <div class="page">
      <div class="page-content">
        <van-loading v-if="loading && !loaded" class="state-block" color="#1989fa">
          加载中...
        </van-loading>

        <van-empty v-else-if="errorText" image="error" :description="errorText">
          <van-button size="small" type="primary" @click="loadProperties">重试</van-button>
        </van-empty>

        <van-empty v-else-if="loaded && properties.length === 0" description="暂无房源" />

        <template v-else>
          <van-cell-group inset>
            <van-field
              :model-value="selectedProperty?.title ?? ''"
              readonly
              is-link
              label="房源"
              placeholder="请选择房源"
              @click="propertyPickerShow = true"
            />
            <van-field
              :model-value="date"
              readonly
              is-link
              label="日期"
              placeholder="请选择日期"
              @click="openDatePicker"
            />
          </van-cell-group>

          <div v-if="propertyId !== null" class="status-card">
            <van-loading v-if="statusLoading" class="state-block" size="20px" color="#1989fa" />
            <div v-else-if="statusError" class="status-text status-error">
              {{ statusError }}
              <van-button size="mini" type="primary" plain @click="loadStatus">重试</van-button>
            </div>
            <div v-else class="status-text">
              <van-icon :name="passwordSet ? 'passed' : 'info-o'" :color="passwordSet ? '#07c160' : '#969799'" />
              {{ date }} 临时密码{{ passwordSet ? '已设置' : '未设置' }}
              <span v-if="passwordSet" class="status-hint">再次设置将覆盖原密码</span>
            </div>

            <van-cell-group inset class="password-form">
              <van-field
                v-model="password"
                label="临时密码"
                placeholder="请输入临时密码"
              />
            </van-cell-group>
            <div class="submit-wrap">
              <van-button round block type="primary" :loading="submitting" @click="onSubmit">
                {{ passwordSet ? '覆盖设置' : '设置密码' }}
              </van-button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <van-popup v-model:show="propertyPickerShow" position="bottom" round>
      <van-picker
        title="选择房源"
        :columns="propertyOptions"
        :columns-field-names="{ value: 'id' }"
        @confirm="onPropertyConfirm"
        @cancel="propertyPickerShow = false"
      >
        <template #option="option">
          {{ option.title }}
        </template>
      </van-picker>
    </van-popup>

    <van-popup v-model:show="datePickerShow" position="bottom" round>
      <van-date-picker
        v-model="pickedDate"
        title="选择日期"
        :columns-type="['year', 'month', 'day']"
        :min-date="new Date(2026, 0, 1)"
        :max-date="new Date(2036, 11, 31)"
        @confirm="onDateConfirm"
        @cancel="datePickerShow = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.state-block {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.status-card {
  margin: 12px 16px 0;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #323233;
  padding: 8px 4px;
}

.status-error {
  color: #ee0a24;
}

.status-hint {
  font-size: 12px;
  color: #969799;
}

.password-form {
  margin-top: 4px;
}

.submit-wrap {
  padding: 16px 4px 4px;
}

:deep(.property-column) {
  text-align: left;
}
</style>
