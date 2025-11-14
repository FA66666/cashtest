<template>
    <div class="report-container">
        <h1>{{ $t('reports.trial_balance') }}</h1>

        <div class="report-controls">
            <div class="form-group">
                <label for="as_of_date">{{ $t('reports.as_of_date') }}</label>
                <input type="date" id="as_of_date" v-model="as_of_date">
            </div>
            <button @click="fetchReport" :disabled="isLoading" class="btn-primary">
                {{ isLoading ? $t('loading') : $t('reports.run_report') }}
            </button>
        </div>

        <div v-if="isLoading" class="loading-message">
            {{ $t('loading') }}
        </div>

        <div v-if="error" class="error">
            {{ $t('errors.load_failed') }}: {{ error }}
        </div>

        <div v-if="reportData" class="report-content">
            <table>
                <thead>
                    <tr>
                        <th>{{ $t('reports.account_code') }}</th>
                        <th>{{ $t('reports.account_name') }}</th>
                        <th>{{ $t('reports.balance') }} (CNY)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="acc in reportData.accounts" :key="acc.guid">
                        <td>{{ acc.code }}</td>
                        <td>{{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, 'CNY') }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="2">{{ $t('reports.total_balance_check') }}</th>
                        <th>{{ formatCurrency(reportData.total_balance, 'CNY') }}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>

<script setup>
// (修改) 移除 computed
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getTrialBalance } from '../../services/reportService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, getISODate } from '../../utils/formatters';
// (删除) 移除 CurrencyPicker
// import CurrencyPicker from '../../components/common/CurrencyPicker.vue';

const { t } = useI18n();
const reportData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const as_of_date = ref(getISODate());

// (删除) 货币相关的 state
// const base_currency_guid = ref(...)
// const selectedCurrencyMnemonic = computed(...)

const fetchReport = async () => {
    isLoading.value = true;
    error.value = null;
    reportData.value = null;

    try {
        // (修改) 移除 currency_guid
        const response = await getTrialBalance(as_of_date.value);
        reportData.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/report-styles.scss";
</style>