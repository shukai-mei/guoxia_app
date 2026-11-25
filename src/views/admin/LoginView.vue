<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { http } from '../../api/http'
import { errorMessageOf } from '../../utils/error'
import { saveAdminAuth } from '../../utils/adminAuth'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const submitting = ref(false)

async function onSubmit() {
  if (!username.value.trim()) {
    showToast('请输入用户名')
    return
  }
  if (!password.value) {
    showToast('请输入密码')
    return
  }
  submitting.value = true
  try {
    const response = await http.post('/admin/api/auth/login', {
      username: username.value.trim(),
      password: password.value
    })
    const data = response.data as { token?: string; expiresAt?: string }
    if (!data.token || !data.expiresAt) {
      throw new Error('登录响应缺少凭证')
    }
    saveAdminAuth({ token: data.token, expiresAt: data.expiresAt })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || '/admin')
  } catch (error) {
    showToast(errorMessageOf(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <van-nav-bar title="小二登录" />

    <div class="page">
      <div class="login-page">
        <div class="login-brand">轻亭看房 · 管理后台</div>

        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="username"
              name="username"
              label="用户名"
              placeholder="请输入用户名"
            />
            <van-field
              v-model="password"
              type="password"
              name="password"
              label="密码"
              placeholder="请输入密码"
            />
          </van-cell-group>

          <div class="submit-wrap">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              :loading="submitting"
            >
              登录
            </van-button>
          </div>
        </van-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-brand {
  padding: 48px 0 24px;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #323233;
}

.submit-wrap {
  padding: 24px 16px;
}
</style>
