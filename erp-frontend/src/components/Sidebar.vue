<template>
    <nav class="sidebar">
        <div class="sidebar-header">
            <h3>ERP System</h3>
        </div>
        <ul class="nav-list">
            <li><router-link :to="{ name: 'Dashboard' }">{{ $t('nav.dashboard') }}</router-link></li>

            <li class="nav-group">
                <span>{{ $t('nav.sales') }}</span>
                <ul>
                    <li><router-link :to="{ name: 'SalesInvoiceList' }">{{ $t('nav.sales_invoices') }}</router-link>
                    </li>
                    <li><router-link :to="{ name: 'CustomerList' }">{{ $t('nav.customers') }}</router-link></li>
                </ul>
            </li>

            <li class="nav-group">
                <span>{{ $t('nav.purchases') }}</span>
                <ul>
                    <li><router-link :to="{ name: 'PurchaseBillList' }">{{ $t('nav.purchase_bills') }}</router-link>
                    </li>
                    <li><router-link :to="{ name: 'VendorList' }">{{ $t('nav.vendors') }}</router-link></li>
                </ul>
            </li>

            <li><router-link :to="{ name: 'Inventory' }">{{ $t('nav.inventory') }}</router-link></li>

            <li><router-link :to="{ name: 'AccountList' }">{{ $t('nav.ledger') }}</router-link></li>

            <li v-if="authStore.hasRole(['admin', 'finance'])">
                <router-link :to="{ name: 'Reports' }">{{ $t('nav.reports') }}</router-link>
            </li>
        </ul>
    </nav>
</template>

<script setup>
import { useAuthStore } from '../store/auth';
const authStore = useAuthStore();
</script>

<style lang="scss" scoped>
/* (修改) 添加 .nav-group 样式 */
.sidebar {
    width: 240px;
    flex-shrink: 0;
    background-color: #34495e;
    color: #ecf0f1;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 1.5rem 1rem;
    text-align: center;
    background-color: #2c3e50;

    h3 {
        margin: 0;
    }
}

.nav-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li a {
        display: block;
        padding: 1rem 1.5rem;
        text-decoration: none;
        color: #ecf0f1;
        transition: background-color 0.2s;

        &:hover {
            background-color: #3b536b;
        }

        &.router-link-active {
            background-color: #1abc9c;
            font-weight: bold;
        }
    }
}

.nav-group {
    span {
        display: block;
        padding: 1rem 1.5rem 0.5rem;
        font-size: 0.9em;
        font-weight: bold;
        color: #95a5a6;
        text-transform: uppercase;
    }

    ul {
        list-style: none;
        padding-left: 0;
    }

    li a {
        padding-left: 2.5rem; // 缩进子菜单
    }
}
</style>