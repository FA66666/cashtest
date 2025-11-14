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
import { getStockItems, getStockLevel } from '../../services/inventoryService';
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
        const itemsResponse = await getStockItems();
        const items = itemsResponse.data;

        const levelPromises = items.map(async (item) => {
            try {
                const levelResponse = await getStockLevel(item.guid);
                return {
                    ...item,
                    stock_level: levelResponse.data.stock_level,
                    total_value: levelResponse.data.total_value,
                    currency_code: levelResponse.data.currency_code
                };
            } catch (err) {
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

<style lang="scss" scoped>
@use "../../assets/page-styles.scss";

.button-group {
    display: flex;
    gap: 1rem;
}
</style>