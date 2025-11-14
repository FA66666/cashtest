<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.inventory') }}</h1>
            <router-link :to="{ name: 'InventoryAdjustment' }" class="btn-primary">
                {{ $t('inventory.adjust') }}
            </router-link>
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
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in stockList" :key="item.guid">
                    <td>{{ item.fullname }}</td>
                    <td>{{ item.mnemonic }}</td>
                    <td>{{ item.stock_level }}</td>
                    <td>{{ item.currency_code }}</td>
                    <td>{{ formatCurrency(item.total_value, item.currency_code) }}</td>
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
import { getStockItems, getStockLevel } from '../../services/inventoryService';
import { parseApiError } from '../../utils/errorHandler';
// (新增) 导入 formatCurrency
import { formatCurrency } from '../../utils/formatters';

const { t } = useI18n();
const stockList = ref([]);
const isLoading = ref(false);
const error = ref(null);

onMounted(async () => {
    isLoading.value = true;
    error.value = null;
    try {
        // 1. 获取所有库存商品 (SKUs)
        const itemsResponse = await getStockItems();
        const items = itemsResponse.data;

        // 2. 为每个商品并行获取其库存水平 (N+1, 但使用 Promise.all)
        const levelPromises = items.map(async (item) => {
            try {
                const levelResponse = await getStockLevel(item.guid);
                // (修改) 扩展返回的数据
                return {
                    ...item,
                    stock_level: levelResponse.data.stock_level,
                    total_value: levelResponse.data.total_value,
                    currency_code: levelResponse.data.currency_code
                };
            } catch (err) {
                // 如果单个商品库存账户未找到, 返回 0
                return {
                    ...item,
                    stock_level: 0,
                    total_value: 0,
                    currency_code: 'N/A'
                };
            }
        });

        stockList.value = await Promise.all(levelPromises);

    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>