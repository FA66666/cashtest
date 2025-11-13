<template>
    <div>
        <div class="page-header">
            <h1>{{ $t('nav.vendors') }}</h1>
            <router-link :to="{ name: 'VendorCreate' }" class="btn-primary" v-if="authStore.hasRole(['admin'])">
                {{ $t('vendors.create') }}
            </router-link>
        </div>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <table v-if="vendors.length > 0">
            <thead>
                <tr>
                    <th>{{ $t('vendors.name') }}</th>
                    <th>{{ $t('vendors.id') }}</th>
                    <th>{{ $t('vendors.currency') }}</th>
                    <th>{{ $t('vendors.active') }}</th>
                    <th v-if="authStore.hasRole(['admin'])">{{ $t('vendors.actions') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="vendor in vendors" :key="vendor.guid">
                    <td>{{ vendor.name }}</td>
                    <td>{{ vendor.id }}</td>
                    <td>{{ vendor.currency }}</td>
                    <td>{{ vendor.active ? 'Yes' : 'No' }}</td>
                    <td v-if="authStore.hasRole(['admin'])">
                        <router-link :to="{ name: 'VendorDetail', params: { guid: vendor.guid } }" class="btn-edit">
                            {{ $t('edit') }}
                        </router-link>
                        <button @click="handleDelete(vendor.guid, vendor.name)" class="btn-remove">
                            {{ $t('delete') }}
                        </button>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getVendors, deleteVendor } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { useAuthStore } from '../../store/auth';

const { t } = useI18n();
const authStore = useAuthStore();
const vendors = ref([]);
const isLoading = ref(false);
const error = ref(null);

async function fetchVendors() {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await getVendors();
        vendors.value = response.data;
    } catch (err) {
        error.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
}

async function handleDelete(guid, name) {
    if (confirm(t('vendors.confirm_delete', { name: name }))) {
        try {
            await deleteVendor(guid);
            await fetchVendors();
        } catch (err) {
            alert(t('errors.delete_failed') + ': ' + parseApiError(err));
        }
    }
}

onMounted(fetchVendors);
</script>

<style lang="scss" scoped>
@use "../../assets/page-styles.scss";
</style>