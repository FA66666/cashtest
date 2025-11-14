<template>
    <div class="dashboard">
        <h1>{{ $t('dashboard.welcome') }}, {{ username }}!</h1>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <div v-if="kpiData" class="kpi-grid">
            <div class="kpi-card">
                <span class="kpi-label">{{ $t('reports.net_income') }} (YTD)</span>
                <span class="kpi-value">{{ formatCurrency(kpiData.netIncome, 'CNY') }}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">{{ $t('reports.total_assets') }}</span>
                <span class="kpi-value">{{ formatCurrency(kpiData.totalAssets, 'CNY') }}</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-label">{{ $t('reports.total_liabilities') }}</span>
                <span class="kpi-value">{{ formatCurrency(kpiData.totalLiabilities, 'CNY') }}</span>
            </div>
        </div>

        <div class="quick-actions">
            <h2>{{ $t('dashboard.quick_actions') }}</h2>
            <div class="action-buttons">
                <router-link :to="{ name: 'CreateSalesInvoice' }" class="btn-primary">
                    {{ $t('sales.create_invoice') }}
                </router-link>
                <router-link :to="{ name: 'CreatePurchaseBill' }" class="btn-primary">
                    {{ $t('purchases.create_bill') }}
                </router-link>
                <router-link :to="{ name: 'CreateJournalEntry' }" class="btn-secondary"
                    v-if="authStore.hasRole(['admin', 'finance'])">
                    {{ $t('ledger.create_journal') }}
                </router-link>
                <router-link :to="{ name: 'InventoryAdjustment' }" class="btn-secondary">
                    {{ $t('inventory.adjust') }}
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../store/auth';
import { getProfitLoss, getBalanceSheet } from '../services/reportService';
import { formatCurrency, getISODate } from '../utils/formatters';
import { parseApiError } from '../utils/errorHandler';

const { t } = useI18n();
const authStore = useAuthStore();

const isLoading = ref(false);
const error = ref(null);
const kpiData = ref(null);

// 从 auth store 获取用户名
const username = computed(() => authStore.user?.name || authStore.user?.username || 'User');

onMounted(async () => {
    isLoading.value = true;
    error.value = null;

    try {
        // 获取日期
        const today = getISODate(new Date());
        // 获取本年第一天
        const yearStart = getISODate(new Date(new Date().getFullYear(), 0, 1));

        // 并行获取利润表和资产负债表数据
        const [plResponse, bsResponse] = await Promise.all([
            getProfitLoss(yearStart, today),
            getBalanceSheet(today)
        ]);

        // 处理数据
        kpiData.value = {
            netIncome: plResponse.data.net_income,
            totalAssets: bsResponse.data.assets.total,
            totalLiabilities: bsResponse.data.liabilities.total
        };

    } catch (err) {
        console.error("Failed to load dashboard data:", err);
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
@use "../assets/page-styles.scss";
/* 导入按钮样式 */

.dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.kpi-grid {
    display: grid;
    /* 响应式网格布局 */
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.kpi-card {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .kpi-label {
        font-size: 0.9em;
        color: #555;
        text-transform: uppercase;
    }

    .kpi-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #34495e;
    }
}

.quick-actions {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    h2 {
        margin-top: 0;
        border-bottom: 1px solid #eee;
        padding-bottom: 0.5rem;
    }

    .action-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
    }
}
</style>