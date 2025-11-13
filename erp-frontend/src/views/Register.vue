<template>
    <div class="login-container">
        <form @submit.prevent="handleRegister" class="login-form">

            <div class="login-language-switcher">
                <LanguageSwitcher />
            </div>

            <h2>{{ $t('register.title') }}</h2>

            <FormError :error="errorMsg" />

            <div class="form-group">
                <label for="name">{{ $t('register.name') }}</label>
                <input type="text" id="name" v-model="name" :placeholder="$t('register.name_placeholder')">
            </div>

            <div class="form-group">
                <label for="username">{{ $t('register.account') }}</label>
                <input type="text" id="username" v-model="username" :placeholder="$t('register.account_placeholder')"
                    required>
            </div>

            <div class="form-group">
                <label for="password">{{ $t('login.password') }}</label>
                <input type="password" id="password" v-model="password"
                    :placeholder="$t('register.password_placeholder')" required>
            </div>

            <button type="submit" :disabled="isLoading">
                {{ isLoading ? $t('register.registering') : $t('register.register_button') }}
            </button>

            <div class="form-link">
                <router-link :to="{ name: 'Login' }">{{ $t('register.back_to_login') }}</router-link>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { register } from '../services/authService';
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue';
import FormError from '../components/common/FormError.vue';
import { parseApiError } from '../utils/errorHandler';

const { t } = useI18n();
const router = useRouter();

const name = ref('');
// (修改点)
const username = ref('');
const password = ref('');
const isLoading = ref(false);
const errorMsg = ref(null);

const handleRegister = async () => {
    isLoading.value = true;
    errorMsg.value = null;

    try {
        // (修改点)
        await register({
            name: name.value,
            username: username.value,
            password: password.value
        });

        router.push({ name: 'Login' });

    } catch (error) {
        console.error("Registration failed:", error);
        errorMsg.value = parseApiError(error);
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
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
}

.login-language-switcher {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
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
</style>