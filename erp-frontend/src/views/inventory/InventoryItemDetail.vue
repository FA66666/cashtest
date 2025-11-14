<template>
    <div class="detail-container">
        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <div v-if="itemDetails">
            <div class="detail-header">
                <h1>{{ $t('inventory.item_details') }}</h1>
                <router-link :to="{ name: 'Inventory' }" class="btn-cancel">{{ $t('back_to_list') }}</router-link>
            </div>

            <h3>{{ $t('inventory.summary_by_currency') }}</h3>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>{{ $t('inventory.stock_account') }}</th>
                        <th>{{ $t('inventory.valuation_currency') }}</th>
                        <th>{{ $t('inventory.stock_level') }}</th>
                        <th>{{ $t('inventory.total_value') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="summary in itemDetails.summary" :key="summary.account_guid">
                        <td>{{ summary.account_name }}</td>
                        <td>{{ summary.currency_code }}</td>
                        <td>{{ summary.total_quantity }}</td>
                        <td>{{ formatCurrency(summary.total_value, summary.currency_code) }}</td>
                    </tr>
                </tbody>
            </table>

            <h3>{{ $t('inventory.ledger_stream') }}</h3>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th>{{ $t('sales.date') }}</th>
                        <th>{{ $t('purchases.description') }}</th>
                        <th>{{ $t('inventory.quantity_change') }}</th>
                        <th>{{ $t('inventory.value_change') }}</th>
                        <th>{{ $t('inventory.stock_account') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(split, index) in itemDetails.ledger" :key="index">
                        <td>{{ formatDateTime(split.post_date) }}</td>
                        <td>{{ split.description }}</td>
                        <td>{{ formatSplitAmount(split.quantity_num, split.quantity_denom) }}</td>
                        <td>{{ formatCurrency(
                            formatSplitAmount(split.value_num, split.value_denom),
                            split.currency_code
                        ) }}</td>
                        <td>{{ split.account_name }}</td>
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
import { getInventoryItemDetails } from '../../services/inventoryService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

const { t } = useI18n();
const route = useRoute();
const isLoading = ref(false);
const error = ref(null);
const itemDetails = ref(null);

// GnuCash 将 100.50 存储为 10050/100
const formatSplitAmount = (num, denom) => {
    if (!denom || denom === 0) return 0;
    return (parseFloat(num) / parseFloat(denom));
};

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    const guid = route.params.commodity_guid;

    try {
        const response = await getInventoryItemDetails(guid);
        itemDetails.value = response.data;
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

.btn-cancel {
    background-color: #95a5a6;
    color: white;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    border-radius: 4px;
}

.summary-table {
    margin-bottom: 2rem;
}
</style>