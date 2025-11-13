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
                            <th>{{ $t('purchases.description') }}</th>
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
                                <input type="text" v-model="item.description" required>
                            </td>
                            <td>
                                <AccountPicker v-model="item.asset_or_expense_account_guid"
                                    :accountTypes="['EXPENSE', 'ASSET', 'STOCK']"
                                    placeholder="Select Expense/Asset Account" required />
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.quantity" required>
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="item.price" required>
                            </td>
                            <td>{{ formatCurrency(item.quantity * item.price) }}</td>
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
                <h3>Total: {{ formatCurrency(totalAmount) }}</h3>
                <button type="submit" :disabled="isLoading" class="btn-submit">
                    {{ isLoading ? $t('submitting') : $t('purchases.create_bill_btn') }}
                </button>
            </div>

        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createPurchaseBill } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import VendorPicker from '../../components/common/VendorPicker.vue';
import FormError from '../../components/common/FormError.vue';

const { t } = useI18n();
const router = useRouter();

const isLoading = ref(false);
const apiError = ref(null);

const getISODateTime = () => new Date().toISOString().slice(0, 16);

// (已修改)
const bill = reactive({
    vendor_guid: '',
    date_opened: getISODateTime(),
    notes: '',
    // accounts_payable_guid: '', // <-- (已移除)
    line_items: [
        { description: '', asset_or_expense_account_guid: '', quantity: 1, price: 0 }
    ]
});

const totalAmount = computed(() => {
    return bill.line_items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
});

const addLineItem = () => {
    bill.line_items.push({ description: '', asset_or_expense_account_guid: '', quantity: 1, price: 0 });
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
        // (已修改)
        const apiPayload = {
            vendor_guid: bill.vendor_guid,
            date_opened: formatDateTimeForAPI(bill.date_opened),
            notes: bill.notes,
            line_items: bill.line_items
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
</style>