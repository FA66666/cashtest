<template>
    <div class="form-container">
        <h1>{{ $t('sales.create_invoice') }}</h1>

        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('sales.details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="customer">{{ $t('sales.customer') }}</label>
                        <CustomerPicker id="customer" v-model="invoice.customer_guid" required />
                    </div>

                    <div class="form-group">
                        <label for="currency">{{ $t('sales.currency') }}</label>
                        <CurrencyPicker id="currency" v-model="invoice.currency_guid" required />
                    </div>

                    <div class="form-group">
                        <label for="date_opened">{{ $t('sales.date') }}</label>
                        <input type="datetime-local" id="date_opened" v-model="invoice.date_opened" required>
                    </div>

                    <div class="form-group">
                        <label for="cogs_account">{{ $t('sales.cogs_account') }}</label>
                        <AccountPicker id="cogs_account" v-model="invoice.cogs_account_guid" :accountTypes="['EXPENSE']"
                            placeholder="Select COGS Account" required :filterByCurrencyGuid="invoice.currency_guid" />
                    </div>

                    <div class="form-group full-width">
                        <label for="notes">{{ $t('sales.notes') }}</label>
                        <input type="text" id="notes" v-model="invoice.notes">
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>{{ $t('sales.line_items') }}</legend>
                <table class="line-items-table">
                    <thead>
                        <tr>
                            <th>{{ $t('sales.item') }}</th>
                            <th>{{ $t('sales.income_account') }}</th>
                            <th>{{ $t('sales.quantity') }}</th>
                            <th>{{ $t('sales.price') }}</th>
                            <th>{{ $t('sales.cost') }}</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in invoice.line_items" :key="index">
                            <td>
                                <CommodityPicker v-model="item.commodity_guid" placeholder="Select Item" required />
                            </td>
                            <td>
                                <AccountPicker v-model="item.income_account_guid" accountTypes="INCOME"
                                    placeholder="Select Income Account" required
                                    :filterByCurrencyGuid="invoice.currency_guid" />
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.quantity" required>
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.price" required>
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.cost" required>
                            </td>
                            <td>{{ formatCurrency(item.quantity * item.price) }}</td>
                            <td>
                                <button type="button" @click="removeLineItem(index)" class="btn-remove"
                                    :disabled="invoice.line_items.length <= 1">X</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <button type="button" @click="addLineItem" class="btn-add">{{ $t('sales.add_line') }}</button>
            </fieldset>

            <div class="form-summary">
                <h3>Total: {{ formatCurrency(totalAmount) }}</h3>
                <button type="submit" :disabled="isLoading" class="btn-submit">
                    {{ isLoading ? $t('submitting') : $t('sales.create_invoice_btn') }}
                </button>
            </div>

        </form>
    </div>
</template>

<script setup>
// (修改) 导入 watch
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createSalesInvoice } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import CustomerPicker from '../../components/common/CustomerPicker.vue';
import FormError from '../../components/common/FormError.vue';
import CommodityPicker from '../../components/common/CommodityPicker.vue';
// (新增)
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';

const { t } = useI18n();
const router = useRouter();

const isLoading = ref(false);
const apiError = ref(null);

const getISODateTime = () => new Date().toISOString().slice(0, 16);

// (已修改)
const invoice = reactive({
    customer_guid: '',
    currency_guid: '', // (新增)
    date_opened: getISODateTime(),
    notes: '',
    cogs_account_guid: '',
    line_items: [
        {
            commodity_guid: '',
            income_account_guid: '',
            quantity: 1,
            price: 0,
            cost: 0
        }
    ]
});

// (新增) 侦听货币变化，重置科目选择
watch(() => invoice.currency_guid, (newCurrency, oldCurrency) => {
    if (newCurrency !== oldCurrency) {
        invoice.cogs_account_guid = '';
        invoice.line_items.forEach(item => {
            item.income_account_guid = '';
        });
    }
});

const totalAmount = computed(() => {
    return invoice.line_items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
});

const addLineItem = () => {
    invoice.line_items.push({
        commodity_guid: '',
        income_account_guid: '',
        quantity: 1,
        price: 0,
        cost: 0
    });
};

const removeLineItem = (index) => {
    if (invoice.line_items.length > 1) {
        invoice.line_items.splice(index, 1);
    }
};

const handleSubmit = async () => {
    isLoading.value = true;
    apiError.value = null;

    try {
        // (已修改)
        const apiPayload = {
            customer_guid: invoice.customer_guid,
            currency_guid: invoice.currency_guid, // (新增)
            date_opened: formatDateTimeForAPI(invoice.date_opened),
            notes: invoice.notes,
            cogs_account_guid: invoice.cogs_account_guid,
            line_items: invoice.line_items.map(item => ({
                commodity_guid: item.commodity_guid,
                income_account_guid: item.income_account_guid,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost,
                description: ''
            }))
        };

        await createSalesInvoice(apiPayload);

        router.push({ name: 'SalesInvoiceList' });

    } catch (error) {
        console.error("Failed to create invoice or navigate:", error);
        apiError.value = parseApiError(error) || error.message;
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";
</style>