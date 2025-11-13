<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.customers') }}</h1>
            <router-link :to="{ name: 'CustomerCreate' }" class="btn-primary" v-if="authStore.hasRole(['admin'])">
                {{ $t('customers.create') }}
            </router-link>
        </div>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <table v-if="customers.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('customers.name') }}</th>
                    <th>{{ $t('customers.id') }}</th>
                    <th>{{ $t('customers.currency') }}</th>
                    <th>{{ $t('customers.active') }}</th>
                    <th v-if="authStore.hasRole(['admin'])">{{ $t('customers.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="customer in customers" :key="customer.guid">
                    <td>{{ customer.name }}</td>
                    <td>{{ customer.id }}</td>
                    <td>{{ customer.currency }}</td>
                    <td>{{ customer.active ? 'Yes' : 'No' }}</td>
                    <td v-if="authStore.hasRole(['admin'])">
                        <router-link :to="{ name: 'CustomerDetail', params: { guid: customer.guid } }" class="btn-edit">
                            {{ $t('edit') }}
                        </router-link>
                        <button @click="handleDelete(customer.guid, customer.name)" class="btn-remove">
                            {{ $t('delete') }}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCustomers, deleteCustomer } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import { useAuthStore } from '../../store/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const customers = ref([]);
const isLoading = ref(false);
const error = ref(null);

async function fetchCustomers() {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await getCustomers();
        customers.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
}

async function handleDelete(guid, name) {
    if (confirm(t('customers.confirm_delete', { name: name }))) {
        try {
            await deleteCustomer(guid);
            // 刷新列表
            await fetchCustomers();
        } catch (err) {
            alert(t('errors.delete_failed') + ': ' + parseApiError(err));
        }
    }
}

onMounted(fetchCustomers);
</script>

<style lang="scss" scoped>
@use "../../assets/page-styles.scss";
</style>