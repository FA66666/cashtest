<template>
    <div class="detail-container">
        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <div v-if="bill">
            <div class="detail-header">
                <h1>{{ $t('purchases.bill_detail_title') }}: {{ bill.id }}</h1>
                <router-link :to="{ name: 'PurchaseBillList' }" class="btn-cancel">{{ $t('back_to_list')
                }}</router-link>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <strong>{{ $t('purchases.vendor') }}:</strong>
                    <span>{{ bill.vendor_name }}</span>
                </div>
                <div class="detail-item">
                    <strong>{{ $t('purchases.date') }}:</strong>
                    <span>{{ formatDateTime(bill.date_opened) }}</span>
                </div>
                <div class="detail-item">
                    <strong>{{ $t('purchases.currency') }}:</strong>
                    <span>{{ bill.currency_code }}</span>
                </div>
                <div class="detail-item full-width">
                    <strong>{{ $t('purchases.notes') }}:</strong>
                    <span>{{ bill.notes }}</span>
                </div>
            </div>

            <h3>{{ $t('purchases.line_items') }}</h3>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th>{{ $t('purchases.description') }}</th>
                        <th>{{ $t('purchases.expense_account') }}</th>
                        <th>{{ $t('purchases.quantity') }}</th>
                        <th>{{ $t('purchases.price') }}</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in bill.entries" :key="entry.guid">
                        <td>{{ entry.description || 'N/A' }}</td>
                        <td>{{ entry.account_name || 'N/A' }}</td>
                        <td>{{ formatSplitAmount(entry.quantity_num, entry.quantity_denom) }}</td>
                        <td>{{ formatSplitAmount(entry.b_price_num, entry.b_price_denom) }}</td>
                        <td>{{ formatCurrency(
                            formatSplitAmount(entry.quantity_num, entry.quantity_denom) *
                            formatSplitAmount(entry.b_price_num, entry.b_price_denom),
                            bill.currency_code
                        ) }}</td>
                    </tr>
                </tbody>
            </table>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getPurchaseBillDetails } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const { t } = useI18n();
const route = useRoute();
const isLoading = ref(false);
const error = ref(null);
const bill = ref(null);

// GnuCash 将 100.50 存储为 10050/100
const formatSplitAmount = (num, denom) => {
    if (!denom || denom === 0) return 0;
    return (parseFloat(num) / parseFloat(denom));
};

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    const guid = route.params.guid;

    try {
        const response = await getPurchaseBillDetails(guid);
        bill.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
// (复用样式)
@use "../../assets/page-styles.scss";
@use "../../assets/form-styles.scss";

.detail-container {
    max-width: 900px;
    margin: 0 auto;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
    background-color: #f9f9f9;
    padding: 1.5rem;
    border-radius: 4px;

    .full-width {
        grid-column: 1 / -1;
    }
}

.detail-item {
    strong {
        display: block;
        margin-bottom: 0.5rem;
        color: #555;
    }

    span {
        font-size: 1.1rem;
    }
}

.btn-cancel {
    background-color: #95a5a6;
    color: white;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    border-radius: 4px;
}
</style>