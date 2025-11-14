<template>
    <div class="detail-container">
        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <div v-if="invoice">
            <div class="detail-header">
                <h1>{{ $t('sales.invoice_detail_title') }}: {{ invoice.id }}</h1>
                <router-link :to="{ name: 'SalesInvoiceList' }" class="btn-cancel">{{ $t('back_to_list')
                }}</router-link>
            </div>

            <div class="detail-grid">
                <div class="detail-item">
                    <strong>{{ $t('sales.customer') }}:</strong>
                    <span>{{ invoice.customer_name }}</span>
                </div>
                <div class="detail-item">
                    <strong>{{ $t('sales.date') }}:</strong>
                    <span>{{ formatDateTime(invoice.date_opened) }}</span>
                </div>
                <div class="detail-item">
                    <strong>{{ $t('sales.currency') }}:</strong>
                    <span>{{ invoice.currency_code }}</span>
                </div>
                <div class="detail-item full-width">
                    <strong>{{ $t('sales.notes') }}:</strong>
                    <span>{{ invoice.notes }}</span>
                </div>
            </div>

            <h3>{{ $t('sales.line_items') }}</h3>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th>{{ $t('sales.description') }}</th>
                        <th>{{ $t('sales.income_account') }}</th>
                        <th>{{ $t('sales.quantity') }}</th>
                        <th>{{ $t('sales.price') }}</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="entry in invoice.entries" :key="entry.guid">
                        <td>{{ entry.description || 'N/A' }}</td>
                        <td>{{ entry.account_name || 'N/A' }}</td>
                        <td>{{ formatSplitAmount(entry.quantity_num, entry.quantity_denom) }}</td>
                        <td>{{ formatSplitAmount(entry.i_price_num, entry.i_price_denom) }}</td>
                        <td>{{ formatCurrency(
                            formatSplitAmount(entry.quantity_num, entry.quantity_denom) *
                            formatSplitAmount(entry.i_price_num, entry.i_price_denom),
                            invoice.currency_code
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
import { getInvoiceDetails } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const { t } = useI18n();
const route = useRoute();
const isLoading = ref(false);
const error = ref(null);
const invoice = ref(null);

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
        const response = await getInvoiceDetails(guid);
        invoice.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
// (使用现有样式)
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