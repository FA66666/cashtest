<template>
    <div class="report-container">
        <h1>{{ $t('reports.balance_sheet') }}</h1>

        <div class="report-controls">
            <div class="form-group">
                <label for="currency">{{ $t('reports.report_currency') }}</label>
                <CurrencyPicker id="currency" v-model="base_currency_guid" required />
            </div>

            <div class="form-group">
                <label for="as_of_date">{{ $t('reports.as_of_date') }}</label>
                <input type="date" id="as_of_date" v-model="as_of_date">
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
            <h3>{{ $t('reports.assets') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.assets.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, selectedCurrencyMnemonic) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_assets') }}</th>
                        <th>{{ formatCurrency(reportData.assets.total, selectedCurrencyMnemonic) }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.liabilities') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.liabilities.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, selectedCurrencyMnemonic) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_liabilities') }}</th>
                        <th>{{ formatCurrency(reportData.liabilities.total, selectedCurrencyMnemonic) }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.equity') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.equity.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance, selectedCurrencyMnemonic) }}</td>
                    </tr>
                    <tr>
                        <td>{{ $t('reports.net_income') }}</td>
                        <td>{{ formatCurrency(reportData.equity.net_income, selectedCurrencyMnemonic) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_equity') }}</th>
                        <th>{{ formatCurrency(reportData.equity.total, selectedCurrencyMnemonic) }}</th>
                    </tr>
                </tfoot>
            </table>

            <hr>
            <h3>{{ $t('reports.total_liabilities_equity') }}: {{ formatCurrency(reportData.total_liabilities_and_equity,
                selectedCurrencyMnemonic)
            }}</h3>
            <strong>{{ $t('reports.balance_check') }}: {{ formatCurrency(reportData.check_balance,
                selectedCurrencyMnemonic) }}</strong>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getBalanceSheet } from '../../services/reportService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, getISODate } from '../../utils/formatters';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue'; // (新增)

const { t } = useI18n();
const reportData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const as_of_date = ref(getISODate());

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
        const response = await getBalanceSheet(as_of_date.value, base_currency_guid.value);
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