import apiClient from "./api";

// --- Vendors ---
export const getVendors = () => {
  return apiClient.get("/purchases/vendors");
};
export const getVendor = (guid) => {
  return apiClient.get(`/purchases/vendors/${guid}`);
};
export const createVendor = (data) => {
  return apiClient.post("/purchases/vendors", data);
};
export const updateVendor = (guid, data) => {
  return apiClient.put(`/purchases/vendors/${guid}`, data);
};
export const deleteVendor = (guid) => {
  return apiClient.delete(`/purchases/vendors/${guid}`);
};

// --- Bills ---
export const getPurchaseBills = () => {
  return apiClient.get("/purchases/bills");
};
export const createPurchaseBill = (billData) => {
  return apiClient.post("/purchases/bills", billData);
};

// (已修改)
export const createVendorPayment = (data) => {
  return apiClient.post("/purchases/payments", data);
};
