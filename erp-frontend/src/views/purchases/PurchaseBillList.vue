<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.purchase_bills') }}</h1>
            <div class="button-group">
                <router-link :to="{ name: 'CreateVendorPayment' }" class="btn-secondary"
                    v-if="authStore.hasRole(['admin', 'finance'])">
                    {{ $t('purchases.record_payment') }}
                </router-link>
                <router-link :to="{ name: 'CreatePurchaseBill' }" class="btn-primary">
                    {{ $t('purchases.create_bill') }}
                </router-link>
            </div>
        </div>

        <div v-if="isLoading" class="loading-message">
            {{ $t('loading') }}
        </div>

        <div v-if="error" class="error">
            {{ $t('errors.load_failed') }}: {{ error }}
        </div>

        <table v-if="bills.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('purchases.bill_id') }}</th>
                    <th>{{ $t('purchases.vendor') }}</th>
                    <th>{{ $t('purchases.date') }}</th>
                    <th>{{ $t('purchases.notes') }}</th>
                    <th>{{ $t('purchases.currency') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="bill in bills" :key="bill.guid">
                    <td>{{ bill.id }}</td>
                    <td>{{ bill.vendor_name }}</td>
                    <td>{{ formatDateTime(bill.date_opened) }}</td>
                    <td>{{ bill.notes }}</td>
                    <td>{{ bill.currency_code }}</td>
                </tr>
            </tbody>
        </table>

        <p v-if="!isLoading && bills.length === 0">
            {{ $t('purchases.no_bills') }}
        </p>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPurchaseBills } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/auth'; // (新增)

const { t } = useI18n();
const authStore = useAuthStore(); // (新增)
const bills = ref([]);
const isLoading = ref(false);
const error = ref(null);

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await getPurchaseBills();
        bills.value = response.data;
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