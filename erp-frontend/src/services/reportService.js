import apiClient from "./api";

// (修改)
export const getTrialBalance = (as_of_date, base_currency_guid) => {
  return apiClient.get("/reports/trial-balance", {
    params: { as_of_date, base_currency_guid },
  });
};

// (修改)
export const getProfitLoss = (start_date, end_date, base_currency_guid) => {
  return apiClient.get("/reports/profit-loss", {
    params: { start_date, end_date, base_currency_guid },
  });
};

// (修改)
export const getBalanceSheet = (as_of_date, base_currency_guid) => {
  return apiClient.get("/reports/balance-sheet", {
    params: { as_of_date, base_currency_guid },
  });
};
