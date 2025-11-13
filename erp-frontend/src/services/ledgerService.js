import apiClient from "./api";

export const getAccounts = () => {
  return apiClient.get("/ledger/accounts");
};
export const getAccount = (guid) => {
  return apiClient.get(`/ledger/accounts/${guid}`);
};
export const createAccount = (data) => {
  return apiClient.post("/ledger/accounts", data);
};
export const updateAccount = (guid, data) => {
  return apiClient.put(`/ledger/accounts/${guid}`, data);
};
export const getAccountBalance = (guid, endDate) => {
  return apiClient.get(`/ledger/accounts/${guid}/balance`, {
    params: { end_date: endDate },
  });
};

// (新增)
export const createJournalEntry = (data) => {
  return apiClient.post("/ledger/journal-entries", data);
};
