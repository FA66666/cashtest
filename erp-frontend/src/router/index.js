import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../store/auth";
import AppLayout from "../components/AppLayout.vue";
import Login from "../views/Login.vue"; //
import Dashboard from "../views/Dashboard.vue"; //
import Register from "../views/Register.vue"; //

const routes = [
  { path: "/login", name: "Login", component: Login },
  { path: "/register", name: "Register", component: Register },
  {
    path: "/",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: "", name: "Dashboard", component: Dashboard },

      // ... (Sales routes) ...
      {
        path: "sales",
        name: "SalesInvoiceList",
        component: () => import("../views/sales/SalesInvoiceList.vue"),
      },
      {
        path: "sales/invoices/:guid",
        name: "SalesInvoiceDetail",
        component: () => import("../views/sales/SalesInvoiceDetail.vue"),
      },
      {
        path: "sales/invoices/new",
        name: "CreateSalesInvoice",
        component: () => import("../views/sales/CreateSalesInvoice.vue"),
      },
      {
        path: "sales/customers",
        name: "CustomerList",
        component: () => import("../views/sales/CustomerList.vue"),
      },
      {
        path: "sales/customers/new",
        name: "CustomerCreate",
        component: () => import("../views/sales/CustomerDetail.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "sales/customers/:guid",
        name: "CustomerDetail",
        component: () => import("../views/sales/CustomerDetail.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "sales/payments/new",
        name: "CreateCustomerPayment",
        component: () => import("../views/sales/CreatePayment.vue"),
        meta: { roles: ["admin", "finance"] },
      },

      // ... (Purchase routes) ...
      {
        path: "purchases/bills",
        name: "PurchaseBillList",
        component: () => import("../views/purchases/PurchaseBillList.vue"),
      },
      {
        path: "purchases/bills/:guid",
        name: "PurchaseBillDetail",
        component: () => import("../views/purchases/PurchaseBillDetail.vue"),
      },
      {
        path: "purchases/bills/new",
        name: "CreatePurchaseBill",
        component: () => import("../views/purchases/CreatePurchaseBill.vue"),
      },
      {
        path: "purchases/vendors",
        name: "VendorList",
        component: () => import("../views/purchases/VendorList.vue"),
      },
      {
        path: "purchases/vendors/new",
        name: "VendorCreate",
        component: () => import("../views/purchases/VendorDetail.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "purchases/vendors/:guid",
        name: "VendorDetail",
        component: () => import("../views/purchases/VendorDetail.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "purchases/payments/new",
        name: "CreateVendorPayment",
        component: () => import("../views/purchases/CreatePayment.vue"),
        meta: { roles: ["admin", "finance"] },
      },

      // (修改) Inventory routes
      {
        path: "inventory",
        name: "Inventory",
        component: () => import("../views/inventory/InventoryList.vue"),
      },
      // (新增)
      {
        path: "inventory/item/:commodity_guid",
        name: "InventoryItemDetail",
        component: () => import("../views/inventory/InventoryItemDetail.vue"),
      },
      {
        path: "inventory/new",
        name: "InventoryCreateItem",
        component: () => import("../views/inventory/CreateItem.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "inventory/adjust",
        name: "InventoryAdjustment",
        component: () => import("../views/inventory/InventoryAdjustment.vue"),
      },

      // ... (Ledger routes) ...
      {
        path: "ledger",
        name: "AccountList",
        component: () => import("../views/ledger/AccountList.vue"),
      },
      {
        path: "ledger/journal-entries/new",
        name: "CreateJournalEntry",
        component: () => import("../views/ledger/CreateJournalEntry.vue"),
        meta: { roles: ["admin", "finance"] },
      },
      {
        path: "ledger/accounts/new",
        name: "AccountCreate",
        component: () => import("../views/ledger/AccountDetail.vue"),
        meta: { roles: ["admin"] },
      },
      {
        path: "ledger/accounts/:guid",
        name: "AccountDetail",
        component: () => import("../views/ledger/AccountDetail.vue"),
        meta: { roles: ["admin"] },
      },

      // ... (Reports routes) ...
      {
        path: "reports",
        name: "Reports",
        component: () => import("../views/reports/ReportsDashboard.vue"),
        meta: { roles: ["admin", "finance"] },
      },
      {
        path: "reports/trial-balance",
        name: "ReportTrialBalance",
        component: () => import("../views/reports/ReportTrialBalance.vue"),
        meta: { roles: ["admin", "finance"] },
      },
      {
        path: "reports/profit-loss",
        name: "ReportProfitLoss",
        component: () => import("../views/reports/ReportProfitLoss.vue"),
        meta: { roles: ["admin", "finance"] },
      },
      {
        path: "reports/balance-sheet",
        name: "ReportBalanceSheet",
        component: () => import("../views/reports/ReportBalanceSheet.vue"),
        meta: { roles: ["admin", "finance"] },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// (路由守卫保持不变)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login" });
  } else if (
    (to.name === "Login" || to.name === "Register") &&
    authStore.isAuthenticated
  ) {
    next({ name: "Dashboard" });
  } else if (to.meta.roles && !authStore.hasRole(to.meta.roles)) {
    console.warn(
      `User role '${authStore.userRole}' does not have access to route '${to.name}'. Required: ${to.meta.roles}`
    );
    next({ name: "Dashboard" });
  } else {
    next();
  }
});

export default router;
