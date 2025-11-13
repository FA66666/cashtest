<template>
    <div class="login-container">
        <form @submit.prevent="handleLogin" class="login-form">

            <div class="login-language-switcher">
                <LanguageSwitcher />
            </div>

            <h2>{{ $t('login.title') }}</h2>

            <div class="form-group">
                <label for="username">{{ $t('login.account') }}</label>
                <input type="text" id="username" v-model="username" required>
            </div>

            <div class="form-group">
                <label for="password">{{ $t('login.password') }}</label>
                <input type="password" id="password" v-model="password" required>
            </div>

            <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

            <button type="submit" :disabled="isLoading">
                {{ isLoading ? $t('login.logging_in') : $t('login.login_button') }}
            </button>

            <div class="form-link">
                <router-link :to="{ name: 'Register' }">{{ $t('login.register_link') }}</router-link>
            </div>

        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

// (修改点)
const username = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMsg = ref(null);

const handleLogin = async () => {
    isLoading.value = true;
    errorMsg.value = null;

    try {
        // (修改点)
        const success = await authStore.login({
            username: username.value,
            password: password.value
        });

        if (success) {
            router.push({ name: 'Dashboard' });
        } else {
            errorMsg.value = t('login.error');
        }
    } catch (err) {
        errorMsg.value = t('login.error');
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss">
/* 样式保持不变 */
.login-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f2f5;
}

.login-form {
    width: 360px;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .login-language-switcher {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 0.5rem;
    }

    :deep(.login-language-switcher label) {
        color: #888;
    }

    h2 {
        text-align: center;
        margin-top: 0;
    }

    .form-group {
        margin-bottom: 1rem;

        label {
            display: block;
            margin-bottom: 0.5rem;
        }

        input {
            width: 100%;
            padding: 0.75rem;
            box-sizing: border-box;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
    }

    button {
        width: 100%;
        padding: 0.75rem;
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;

        &:hover {
            background-color: #2980b9;
        }

        &:disabled {
            background-color: #bdc3c7;
            cursor: not-allowed;
        }
    }

    .error {
        color: red;
        font-size: 0.9em;
        text-align: center;
        margin-bottom: 1rem;
    }

    .form-link {
        text-align: center;
        margin-top: 1.5rem;
        font-size: 0.9em;

        a {
            color: #3498db;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }
}
</style>