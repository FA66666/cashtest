<template>
    <div>
        <h1>{{ $t('nav.reports') }}</h1>
        <ul>
            <li>
                <router-link :to="{ name: 'ReportTrialBalance' }">
                    {{ $t('reports.trial_balance') }}
                </router-link>
            </li>
            <li>
                <router-link :to="{ name: 'ReportProfitLoss' }">
                    {{ $t('reports.profit_loss') }}
                </router-link>
            </li>
            <li>
                <router-link :to="{ name: 'ReportBalanceSheet' }">
                    {{ $t('reports.balance_sheet') }}
                </router-link>
            </li>
        </ul>
    </div>
</template>

<script setup>
// 这个组件只是一个简单的导航页面，所以脚本部分为空
</script>

<style lang="scss" scoped>
ul {
    list-style: none;
    padding-left: 0;
}

li {
    font-size: 1.2rem;
    margin-bottom: 1rem;
}

a {
    text-decoration: none;
    color: #3498db;

    &:hover {
        text-decoration: underline;
    }
}
</style>