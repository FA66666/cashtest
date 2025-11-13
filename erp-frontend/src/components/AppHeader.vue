<template>
    <header class="app-header">
        <div class="header-left">
        </div>
        <div class="header-right">

            <LanguageSwitcher />

            <div class="user-info">
                <span>{{ username }}</span>
                <button @click="handleLogout" class="logout-btn">{{ $t('nav.logout') }}</button>
            </div>
        </div>
    </header>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../store/auth';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './common/LanguageSwitcher.vue';

const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();

// (修改点)
const username = computed(() => authStore.user?.username || 'user');

const handleLogout = () => {
    authStore.logout();
};
</script>

<style lang="scss">
/* 样式保持不变 */
.app-header {
    height: 60px;
    flex-shrink: 0;
    background-color: #ffffff;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.logout-btn {
    padding: 0.5rem 1rem;
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #c0392b;
    }
}
</style>