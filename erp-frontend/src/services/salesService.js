import apiClient from "./api";

// --- Customers ---
export const getCustomers = () => {
  return apiClient.get("/sales/customers");
};
export const getCustomer = (guid) => {
  return apiClient.get(`/sales/customers/${guid}`);
};
export const createCustomer = (data) => {
  return apiClient.post("/sales/customers", data);
};
export const updateCustomer = (guid, data) => {
  return apiClient.put(`/sales/customers/${guid}`, data);
};
export const deleteCustomer = (guid) => {
  return apiClient.delete(`/sales/customers/${guid}`);
};

// --- Invoices ---
export const getSalesInvoices = () => {
  return apiClient.get("/sales/invoices");
};
export const createSalesInvoice = (invoiceData) => {
  return apiClient.post("/sales/invoices", invoiceData);
};
export const getInvoiceDetails = (guid) => {
  return apiClient.get(`/sales/invoices/${guid}`);
};

// (已修改)
export const createCustomerPayment = (data) => {
  return apiClient.post("/sales/payments", data);
};
