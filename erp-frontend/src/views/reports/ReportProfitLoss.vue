<template>
    <div class="report-container">
        <h1>{{ $t('reports.profit_loss') }}</h1>

        <div class="report-controls">
            <div class="form-group">
                <label for="currency">{{ $t('reports.report_currency') }}</label>
                <CurrencyPicker id="currency" v-model="base_currency_guid" required />
            </div>
            <div class="form-group">
                <label for="start_date">{{ $t('reports.start_date') }}</label>
                <input type="date" id="start_date" v-model="start_date">
            </div>
            <div class="form-group">
                <label for="end_date">{{ $t('reports.end_date') }}</label>
                <input type="date" id="end_date" v-model="end_date">
            </div>
            <button @click="fetchReport" :disabled="isLoading || !base_currency_guid" class="btn-primary">
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
                        <td>{{ formatCurrency(acc.balance, selectedCurrencyMnemonic) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_income') }}</th>
                        <th>{{ formatCurrency(reportData.total_income, selectedCurrencyMnemonic) }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.expense') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.expense_accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, selectedCurrencyMnemonic) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_expense') }}</th>
                        <th>{{ formatCurrency(reportData.total_expense, selectedCurrencyMnemonic) }}</th>
                    </tr>
                </tfoot>
            </table>

            <hr>
            <h3>{{ $t('reports.net_income') }}: {{ formatCurrency(reportData.net_income, selectedCurrencyMnemonic) }}
            </h3>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfitLoss } from '../../services/reportService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, getISODate } from '../../utils/formatters';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue'; // (新增)

const { t } = useI18n();
const reportData = ref(null);
const isLoading = ref(false);
const error = ref(null);

const defaultStart = new Date(new Date().getFullYear(), 0, 1);
const start_date = ref(getISODate(defaultStart));
const end_date = ref(getISODate());

// (新增)
const base_currency_guid = ref('ade56487e45e41219b5810c14b76c11d'); // 默认为 USD
const selectedCurrencyMnemonic = computed(() => {
    if (base_currency_guid.value === 'f4b3e81a3d3e4ed8b46a7c06f8c4c7b8') return 'CNY';
    if (base_currency_guid.value === '8e7f1a8f9d6f4c8e9b6c1e5d7f6a5b4c') return 'EUR';
    if (base_currency_guid.value === '9a8f7c6e5d4b3c2a1b9e8f7a6b5c4d3e') return 'JPY';
    return 'USD';
});

const fetchReport = async () => {
    isLoading.value = true;
    error.value = null;
    reportData.value = null;

    try {
        // (修改)
        const response = await getProfitLoss(start_date.value, end_date.value, base_currency_guid.value);
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