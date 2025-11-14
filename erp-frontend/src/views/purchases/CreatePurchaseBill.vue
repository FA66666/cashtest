<template>
    <div class="form-container">
        <h1>{{ $t('purchases.create_bill') }}</h1>

        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('purchases.details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="vendor">{{ $t('purchases.vendor') }}</label>
                        <VendorPicker id="vendor" v-model="bill.vendor_guid" required />
                    </div>

                    <div class="form-group">
                        <label for="currency">{{ $t('purchases.currency') }}</label>
                        <CurrencyPicker id="currency" v-model="bill.currency_guid" required
                            @currenciesLoaded="allCurrencies = $event" />
                    </div>

                    <div class="form-group">
                        <label for="date_opened">{{ $t('purchases.date') }}</label>
                        <input type="datetime-local" id="date_opened" v-model="bill.date_opened" required>
                    </div>

                    <div class="form-group full-width">
                        <label for="notes">{{ $t('purchases.notes') }}</label>
                        <input type="text" id="notes" v-model="bill.notes">
                    </div>

                </div>
            </fieldset>

            <fieldset>
                <legend>{{ $t('purchases.line_items') }}</legend>

                <table class="line-items-table">
                    <thead>
                        <tr>
                            <th>{{ $t('sales.item') }} / {{ $t('purchases.description') }}</th>
                            <th>{{ $t('purchases.expense_account') }}</th>
                            <th>{{ $t('purchases.quantity') }}</th>
                            <th>{{ $t('purchases.price') }}</th>
                            <th>Total</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, index) in bill.line_items" :key="index">
                            <td>
                                <label class="item-type-toggle">
                                    <input type="checkbox" v-model="item.isStockItem"> {{ $t('inventory.is_stock_item')
                                    }}
                                </label>

                                <CommodityPicker v-if="item.isStockItem" v-model="item.commodity_guid"
                                    placeholder="Select Stock Item" required />
                                <input v-if="!item.isStockItem" type="text" v-model="item.description" required>
                            </td>
                            <td>
                                <AccountPicker v-if="item.isStockItem" v-model="item.asset_or_expense_account_guid"
                                    :accountTypes="['STOCK']" placeholder="Select Stock Account" required
                                    :filterByCommodityGuid="item.commodity_guid"
                                    :filterByCurrencyGuid="bill.currency_guid" />

                                <AccountPicker v-if="!item.isStockItem" v-model="item.asset_or_expense_account_guid"
                                    :accountTypes="['EXPENSE', 'ASSET']" placeholder="Select Expense/Asset Account"
                                    required :filterByCurrencyGuid="bill.currency_guid" />
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.quantity" required>
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.price" required>
                            </td>
                            <td>{{ formatCurrency(item.quantity * item.price, selectedCurrencyMnemonic) }}</td>
                            <td>
                                <button type="button" @click="removeLineItem(index)" class="btn-remove"
                                    :disabled="bill.line_items.length <= 1">X</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <button type="button" @click="addLineItem" class="btn-add">{{ $t('purchases.add_line') }}</button>
            </fieldset>

            <div class="form-summary">
                <h3>Total: {{ formatCurrency(totalAmount, selectedCurrencyMnemonic) }}</h3>
                <button type="submit" :disabled="isLoading" class="btn-submit">
                    {{ isLoading ? $t('submitting') : $t('purchases.create_bill_btn') }}
                </button>
            </div>

        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createPurchaseBill } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import VendorPicker from '../../components/common/VendorPicker.vue';
import FormError from '../../components/common/FormError.vue';
import CommodityPicker from '../../components/common/CommodityPicker.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';

const { t } = useI18n();
const router = useRouter();

const isLoading = ref(false);
const apiError = ref(null);
const allCurrencies = ref([]);

const getISODateTime = () => new Date().toISOString().slice(0, 16);

const bill = reactive({
    vendor_guid: '',
    currency_guid: '',
    date_opened: getISODateTime(),
    notes: '',
    line_items: [
        {
            isStockItem: false,
            commodity_guid: null,
            description: '',
            asset_or_expense_account_guid: '',
            quantity: 1,
            price: 0
        }
    ]
});

watch(() => bill.currency_guid, (newCurrency, oldCurrency) => {
    if (newCurrency !== oldCurrency) {
        bill.line_items.forEach(item => {
            // (修改) 现在我们重置 *所有* 科目
            item.asset_or_expense_account_guid = '';
        });
    }
});

const selectedCurrencyMnemonic = computed(() => {
    if (!bill.currency_guid || allCurrencies.value.length === 0) return 'USD';
    const currency = allCurrencies.value.find(c => c.guid === bill.currency_guid);
    return currency ? currency.mnemonic : 'USD';
});

const totalAmount = computed(() => {
    return bill.line_items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
});

const addLineItem = () => {
    bill.line_items.push({
        isStockItem: false,
        commodity_guid: null,
        description: '',
        asset_or_expense_account_guid: '',
        quantity: 1,
        price: 0
    });
};

const removeLineItem = (index) => {
    if (bill.line_items.length > 1) {
        bill.line_items.splice(index, 1);
    }
};

const handleSubmit = async () => {
    isLoading.value = true;
    apiError.value = null;

    try {
        const apiPayload = {
            vendor_guid: bill.vendor_guid,
            currency_guid: bill.currency_guid,
            date_opened: formatDateTimeForAPI(bill.date_opened),
            notes: bill.notes,
            line_items: bill.line_items.map(item => ({
                isStockItem: item.isStockItem,
                commodity_guid: item.isStockItem ? item.commodity_guid : null,
                description: item.isStockItem ? '' : item.description,
                asset_or_expense_account_guid: item.asset_or_expense_account_guid,
                quantity: item.quantity,
                price: item.price
            }))
        };

        await createPurchaseBill(apiPayload);
        router.push({ name: 'PurchaseBillList' });

    } catch (error) {
        console.error("Failed to create bill:", error);
        apiError.value = parseApiError(error) || error.message;
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";

.item-type-toggle {
    display: block;
    margin-bottom: 8px;
    font-size: 0.9em;
    color: #34495e;
}
</style>