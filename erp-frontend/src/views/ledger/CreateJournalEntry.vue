<template>
    <div class="form-container">
        <h1>{{ $t('ledger.create_journal') }}</h1>
        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('ledger.journal_details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="date">{{ $t('sales.date') }}</label>
                        <input type="datetime-local" id="date" v-model="entry.date" required>
                    </div>
                    <div class="form-group">
                        <label for="currency">{{ $t('customers.currency') }}</label>
                        <CurrencyPicker id="currency" v-model="entry.currency_guid" required />
                    </div>
                    <div class="form-group full-width">
                        <label for="description">{{ $t('sales.description') }}</label>
                        <input type="text" id="description" v-model="entry.description" required>
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>{{ $t('ledger.splits') }}</legend>
                <table class="line-items-table">
                    <thead>
                        <tr>
                            <th>{{ $t('ledger.account') }}</th>
                            <th>{{ $t('ledger.memo') }}</th>
                            <th>{{ $t('ledger.debit') }}</th>
                            <th>{{ $t('ledger.credit') }}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(split, index) in entry.splits" :key="index">
                            <td>
                                <AccountPicker v-model="split.account_guid"
                                    :accountTypes="['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'STOCK']"
                                    placeholder="Select Account" required />
                            </td>
                            <td>
                                <input type="text" v-model="split.memo" placeholder="Optional memo">
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="split.debit"
                                    @change="updateSplit('debit', index)" :disabled="split.credit > 0">
                            </td>
                            <td>
                                <input type="number" step="0.01" min="0" v-model.number="split.credit"
                                    @change="updateSplit('credit', index)" :disabled="split.debit > 0">
                            </td>
                            <td>
                                <button type="button" @click="removeLineItem(index)" class="btn-remove"
                                    :disabled="entry.splits.length <= 2">X</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <button type="button" @click="addLineItem" class="btn-add">{{ $t('sales.add_line') }}</button>
            </fieldset>

            <div class="form-summary">
                <div>
                    <h3>{{ $t('ledger.totals') }}:</h3>
                    <h3 class="total-line">Debit: {{ formatCurrency(totalDebit) }}</h3>
                    <h3 class="total-line">Credit: {{ formatCurrency(totalCredit) }}</h3>
                    <h3 :class="isBalanced ? 'balanced' : 'unbalanced'">
                        {{ isBalanced ? $t('ledger.balanced') : $t('ledger.unbalanced') }}
                    </h3>
                </div>
                <button type="submit" :disabled="isSubmitting || !isBalanced" class="btn-submit">
                    {{ isSubmitting ? $t('submitting') : $t('ledger.post_entry') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createJournalEntry } from '../../services/ledgerService';
import { parseApiError } from '../../utils/errorHandler';
import { formatCurrency, formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';
import FormError from '../../components/common/FormError.vue';

const { t } = useI18n();
const router = useRouter();

const isSubmitting = ref(false);
const apiError = ref(null);
const getISODateTime = () => new Date().toISOString().slice(0, 16);

const entry = reactive({
    date: getISODateTime(),
    description: '',
    currency_guid: '', // 用户必须选择一个
    splits: [
        { account_guid: '', memo: '', debit: 0, credit: 0, value: 0 },
        { account_guid: '', memo: '', debit: 0, credit: 0, value: 0 }
    ]
});

const totalDebit = computed(() => entry.splits.reduce((sum, s) => sum + (s.debit || 0), 0));
const totalCredit = computed(() => entry.splits.reduce((sum, s) => sum + (s.credit || 0), 0));
const isBalanced = computed(() => Math.abs(totalDebit.value - totalCredit.value) < 0.001 && totalDebit.value > 0);

const addLineItem = () => {
    entry.splits.push({ account_guid: '', memo: '', debit: 0, credit: 0, value: 0 });
};

const removeLineItem = (index) => {
    if (entry.splits.length > 2) {
        entry.splits.splice(index, 1);
    }
};

// 确保用户不能同时输入借方和贷方
// 并设置 'value' (借方为正, 贷方为负)
const updateSplit = (type, index) => {
    const split = entry.splits[index];
    if (type === 'debit' && split.debit > 0) {
        split.credit = 0;
        split.value = split.debit; // Debits are positive
    } else if (type === 'credit' && split.credit > 0) {
        split.debit = 0;
        split.value = -split.credit; // Credits are negative
    } else {
        // 如果都清零了
        split.value = 0;
        if (type === 'debit') split.debit = 0;
        if (type === 'credit') split.credit = 0;
    }
};

const handleSubmit = async () => {
    isSubmitting.value = true;
    apiError.value = null;

    if (!isBalanced.value) {
        apiError.value = t('ledger.must_balance');
        isSubmitting.value = false;
        return;
    }

    try {
        const apiPayload = {
            date: formatDateTimeForAPI(entry.date),
            description: entry.description,
            currency_guid: entry.currency_guid,
            // 过滤掉 value 为 0 的行 (可选，但推荐)
            splits: entry.splits
                .filter(s => s.value !== 0)
                .map(s => ({
                    account_guid: s.account_guid,
                    memo: s.memo,
                    value: s.value
                }))
        };

        // 再次检查，过滤后可能少于2行
        if (apiPayload.splits.length < 2) {
            throw new Error(t('ledger.must_have_splits'));
        }

        await createJournalEntry(apiPayload);
        router.push({ name: 'AccountList' });

    } catch (error) {
        console.error("Failed to create journal entry:", error);
        apiError.value = parseApiError(error) || error.message;
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";

.form-summary {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 1.5rem;

    h3 {
        margin: 0.25rem 0;
    }

    .total-line {
        font-weight: normal;
    }

    .balanced {
        color: #2ecc71; // green
        font-weight: bold;
    }

    .unbalanced {
        color: #e74c3c; // red
        font-weight: bold;
    }

    .btn-submit:disabled {
        background-color: #bdc3c7;
        cursor: not-allowed;
    }
}
</style>