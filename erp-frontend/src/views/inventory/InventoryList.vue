<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.inventory') }}</h1>
            <div class="button-group">
                <router-link :to="{ name: 'InventoryCreateItem' }" class="btn-secondary"
                    v-if="authStore.hasRole(['admin'])">
                    {{ $t('inventory.create_item') }}
                </router-link>
                <router-link :to="{ name: 'InventoryAdjustment' }" class="btn-primary">
                    {{ $t('inventory.adjust') }}
                </router-link>
            </div>
        </div>

        <div v-if="isLoading" class="loading-message">
            {{ $t('loading') }}
        </div>

        <div v-if="error" class="error">
            {{ $t('errors.load_failed') }}: {{ error }}
        </div>

        <table v-if="stockList.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('inventory.item_name') }}</th>
                    <th>{{ $t('inventory.mnemonic') }} (SKU)</th>
                    <th>{{ $t('inventory.stock_level') }}</th>
                    <th>{{ $t('inventory.valuation_currency') }}</th>
                    <th>{{ $t('inventory.total_value') }}</th>
                    <th>{{ $t('vendors.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in stockList" :key="item.guid">
                    <td>
                        {{ item.fullname }}
                    </td>
                    <td>{{ item.mnemonic }}</td>
                    <td>{{ item.stock_level }}</td>
                    <td>{{ item.currency_code }}</td>
                    <td>{{ formatCurrency(item.total_value, item.currency_code) }}</td>
                    <td>
                        <router-link :to="{ name: 'InventoryItemDetail', params: { commodity_guid: item.guid } }"
                            class="btn-edit">
                            {{ $t('inventory.view_details') }}
                        </router-link>
                    </td>
                </tr>
            </tbody>
        </table>

        <p v-if="!isLoading && stockList.length === 0">
            {{ $t('inventory.no_items') }}
        </p>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
// (修改) 导入新的 batch 函数，移除旧的
import { getStockLevelsBatch } from '../../services/inventoryService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const stockList = ref([]);
const isLoading = ref(false);
const error = ref(null);

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    try {
        // (修改) 只调用一次新的 batch API
        const response = await getStockLevelsBatch();

        // (修改) API 现在一次性返回所有数据
        stockList.value = response.data;

        // (移除) 不再需要 N+1 循环
        // const itemsResponse = await getStockItems();
        // const items = itemsResponse.data;
        // const levelPromises = items.map(async (item) => { ... });
        // stockList.value = await Promise.all(levelPromises);

    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
@use "../../assets/page-styles.scss";

.button-group {
    display: flex;
    gap: 1rem;
}
</style>