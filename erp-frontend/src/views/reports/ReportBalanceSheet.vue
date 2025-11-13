<template>
    <div class="report-container">
        <h1>{{ $t('reports.balance_sheet') }}</h1>

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
            <h3>{{ $t('reports.assets') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.assets.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_assets') }}</th>
                        <th>{{ formatCurrency(reportData.assets.total) }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.liabilities') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.liabilities.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_liabilities') }}</th>
                        <th>{{ formatCurrency(reportData.liabilities.total) }}</th>
                    </tr>
                </tfoot>
            </table>

            <h3>{{ $t('reports.equity') }}</h3>
            <table>
                <tbody>
                    <tr v-for="acc in reportData.equity.accounts" :key="acc.guid">
                        <td>{{ acc.code }} - {{ acc.name }}</td>
                        <td>{{ formatCurrency(acc.balance) }}</td>
                    </tr>
                    <tr>
                        <td>{{ $t('reports.net_income') }}</td>
                        <td>{{ formatCurrency(reportData.equity.net_income) }}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <th>{{ $t('reports.total_equity') }}</th>
                        <th>{{ formatCurrency(reportData.equity.total) }}</th>
                    </tr>
                </tfoot>
            </table>

            <hr>
            <h3>{{ $t('reports.total_liabilities_equity') }}: {{ formatCurrency(reportData.total_liabilities_and_equity)
            }}</h3>
            <strong>{{ $t('reports.balance_check') }}: {{ formatCurrency(reportData.check_balance) }}</strong>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getBalanceSheet } from '../../services/reportService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, getISODate } from '../../utils/formatters';

const { t } = useI18n();
const reportData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const as_of_date = ref(getISODate()); // 默认今天

const fetchReport = async () => {
    isLoading.value = true;
    error.value = null;
    reportData.value = null;

    try {
        const response = await getBalanceSheet(as_of_date.value);
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