<template>
    <div class="report-container">
        <h1>{{ $t('reports.profit_loss') }}</h1>

        <div class="report-controls">
            <div class="form-group">
                <label for="start_date">{{ $t('reports.start_date') }}</label>
                <input type="date" id="start_date" v-model="start_date">
            </div>
            <div class="form-group">
                <label for="end_date">{{ $t('reports.end_date') }}</label>
                <input type="date" id="end_date" v-model="end_date">
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
            <h3>{{ $t('reports.income') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.income_accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, 'CNY') }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_income') }}</th>
                        <th>{{ formatCurrency(reportData.total_income, 'CNY') }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.expense') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.expense_accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, 'CNY') }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_expense') }}</th>
                        <th>{{ formatCurrency(reportData.total_expense, 'CNY') }}</th>
                    </tr>
                </tfoot>
            </table>

            <hr>
            <h3>{{ $t('reports.net_income') }}: {{ formatCurrency(reportData.net_income, 'CNY') }}
            </h3>
        </div>
    </div>
</template>

<script setup>
// (修改) 移除 computed
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfitLoss } from '../../services/reportService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, getISODate } from '../../utils/formatters';
// (删除) 移除 CurrencyPicker
// import CurrencyPicker from '../../components/common/CurrencyPicker.vue';

const { t } = useI18n();
const reportData = ref(null);
const isLoading = ref(false);
const error = ref(null);

const defaultStart = new Date(new Date().getFullYear(), 0, 1);
const start_date = ref(getISODate(defaultStart));
const end_date = ref(getISODate());

// (删除) 货币相关的 state
// const base_currency_guid = ref(...)
// const selectedCurrencyMnemonic = computed(...)

const fetchReport = async () => {
    isLoading.value = true;
    error.value = null;
    reportData.value = null;

    try {
        // (修改) 移除 currency_guid
        const response = await getProfitLoss(start_date.value, end_date.value);
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