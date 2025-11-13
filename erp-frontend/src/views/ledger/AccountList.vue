<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.ledger') }} (Chart of Accounts)</h1>
            <div class="button-group">
                <router-link :to="{ name: 'CreateJournalEntry' }" class="btn-secondary"
                    v-if="authStore.hasRole(['admin', 'finance'])">
                    {{ $t('ledger.create_journal') }}
                </router-link>
                <router-link :to="{ name: 'AccountCreate' }" class="btn-primary" v-if="authStore.hasRole(['admin'])">
                    {{ $t('ledger.create') }}
                </router-link>
            </div>
        </div>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <table v-if="accounts.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('ledger.code') }}</th>
                    <th>{{ $t('ledger.name') }}</th>
                    <th>{{ $t('ledger.type') }}</th>
                    <th>{{ $t('ledger.placeholder') }}</th>
                    <th v-if="authStore.hasRole(['admin'])">{{ $t('ledger.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="account in accounts" :key="account.guid">
                    <td>{{ account.code }}</td>
                    <td>{{ account.name }}</td>
                    <td>{{ account.account_type }}</td>
                    <td>{{ account.placeholder ? 'Yes' : 'No' }}</td>
                    <td v-if="authStore.hasRole(['admin'])">
                        <router-link :to="{ name: 'AccountDetail', params: { guid: account.guid } }" class="btn-edit">
                            {{ $t('edit') }}
                        </router-link>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAccounts } from '../../services/ledgerService';
import { parseApiError } from '../../utils/errorHandler';
import { useAuthStore } from '../../store/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const accounts = ref([]);
const isLoading = ref(false);
const error = ref(null);

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await getAccounts();
        accounts.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
/* (修改) 确保两个按钮并排 */
@use "../../assets/page-styles.scss";

.button-group {
    display: flex;
    gap: 1rem;
}
</style>