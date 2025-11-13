<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.sales_invoices') }}</h1>
            <div class="button-group">
                <router-link :to="{ name: 'CreateCustomerPayment' }" class="btn-secondary"
                    v-if="authStore.hasRole(['admin', 'finance'])">
                    {{ $t('sales.record_payment') }}
                </router-link>
                <router-link :to="{ name: 'CreateSalesInvoice' }" class="btn-primary">
                    {{ $t('sales.create_invoice') }}
                </router-link>
            </div>
        </div>

        <div v-if="isLoading" class="loading-message">
            {{ $t('loading') }}
        </div>

        <div v-if="error" class="error">
            {{ $t('errors.load_failed') }}: {{ error }}
        </div>

        <table v-if="invoices.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('sales.invoice_id') }}</th>
                    <th>{{ $t('sales.customer') }}</th>
                    <th>{{ $t('sales.date') }}</th>
                    <th>{{ $t('sales.notes') }}</th>
                    <th>{{ $t('sales.currency') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="invoice in invoices" :key="invoice.guid">
                    <td>{{ invoice.id }}</td>
                    <td>{{ invoice.customer_name }}</td>
                    <td>{{ formatDateTime(invoice.date_opened) }}</td>
                    <td>{{ invoice.notes }}</td>
                    <td>{{ invoice.currency_code }}</td>
                </tr>
            </tbody>
        </table>

        <p v-if="!isLoading && invoices.length === 0">
            {{ $t('sales.no_invoices') }}
        </p>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSalesInvoices } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/auth'; // (新增)

const { t } = useI18n();
const authStore = useAuthStore(); // (新增)
const invoices = ref([]);
const isLoading = ref(false);
const error = ref(null);

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await getSalesInvoices();
        invoices.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
@use "../../assets/page-styles.scss";

/* (新增) 按钮组样式 */
.button-group {
    display: flex;
    gap: 1rem;
}
</style>