<template>
    <div>
        <h1>{{ $t('nav.reports') }}</h1>
        <div class="report-links">
            <router-link :to="{ name: 'ReportTrialBalance' }" class="btn-secondary">
                {{ $t('reports.trial_balance') }}
            </router-link>
            <router-link :to="{ name: 'ReportProfitLoss' }" class="btn-secondary">
                {{ $t('reports.profit_loss') }}
            </router-link>
            <router-link :to="{ name: 'ReportBalanceSheet' }" class="btn-secondary">
                {{ $t('reports.balance_sheet') }}
            </router-link>
        </div>
    </div>
</template>

<script setup>
// 这个组件只是一个简单的导航页面，所以脚本部分为空
</script>

<style lang="scss" scoped>
/* 导入 page-styles.scss 以使用 .btn-secondary 样式 */
@use "../../assets/page-styles.scss";

.report-links {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
}
</style>