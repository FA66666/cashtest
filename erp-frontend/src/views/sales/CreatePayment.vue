<template>
    <div class="form-container">
        <h1>{{ $t('sales.record_payment') }}</h1>
        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('sales.payment_details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="date">{{ $t('sales.date') }}</label>
                        <input type="datetime-local" id="date" v-model="payment.date" required>
                    </div>
                    <div class="form-group">
                        <label for="amount">{{ $t('sales.amount') }}</label>
                        <input type="number" step="0.01" min="0" id="amount" v-model.number="payment.amount" required>
                    </div>
                    <div class="form-group">
                        <label for="currency">{{ $t('customers.currency') }}</label>
                        <CurrencyPicker id="currency" v-model="payment.currency_guid" required />
                    </div>
                    <div class="form-group">
                        <label for="checking_account">{{ $t('sales.checking_account') }}</label>
                        <AccountPicker id="checking_account" v-model="payment.checking_account_guid"
                            accountTypes="ASSET" placeholder="Select Bank/Checking Account" required
                            :filterByCurrencyGuid="payment.currency_guid" />
                    </div>

                    <div class="form-group">
                        <label for="customer">{{ $t('sales.customer') }}</label>
                        <CustomerPicker id="customer" v-model="payment.customer_guid" placeholder="Select Customer"
                            required />
                    </div>
                    <div class="form-group full-width">
                        <label for="description">{{ $t('sales.description') }}</label>
                        <input type="text" id="description" v-model="payment.description" required>
                    </div>
                </div>
            </fieldset>

            <div class="form-actions">
                <router-link :to="{ name: 'SalesInvoiceList' }" class="btn-cancel">{{ $t('cancel') }}</router-link>
                <button type="submit" :disabled="isSubmitting" class="btn-submit">
                    {{ isSubmitting ? $t('submitting') : $t('sales.record_payment') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
// (修改) 导入 watch
import { ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createCustomerPayment } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';
import FormError from '../../components/common/FormError.vue';
import CustomerPicker from '../../components/common/CustomerPicker.vue';

const { t } = useI18n();
const router = useRouter();

const isSubmitting = ref(false);
const apiError = ref(null);
const getISODateTime = () => new Date().toISOString().slice(0, 16);

// (已修改)
const payment = reactive({
    date: getISODateTime(),
    description: 'Customer Payment',
    currency_guid: '',
    checking_account_guid: '',
    customer_guid: '',
    amount: 0
});

// (新增) 侦听货币变化，重置银行账户
watch(() => payment.currency_guid, (newCurrency, oldCurrency) => {
    if (newCurrency !== oldCurrency) {
        payment.checking_account_guid = '';
    }
});

const handleSubmit = async () => {
    isSubmitting.value = true;
    apiError.value = null;

    try {
        // (已修改)
        const apiPayload = {
            date: formatDateTimeForAPI(payment.date),
            description: payment.description,
            currency_guid: payment.currency_guid,
            checking_account_guid: payment.checking_account_guid,
            customer_guid: payment.customer_guid,
            amount: payment.amount
        };

        await createCustomerPayment(apiPayload);
        router.push({ name: 'SalesInvoiceList' });

    } catch (error) {
        console.error("Failed to create payment:", error);
        apiError.value = parseApiError(error) || error.message;
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";

.form-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
}

.btn-cancel {
    background-color: #95a5a6;
    color: white;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    border-radius: 4px;
}
</style>