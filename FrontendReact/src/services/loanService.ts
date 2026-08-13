import { api } from "./api";
import { ExternalLoan, CreateExternalLoanPayload, UpdateExternalLoanPayload } from "../types";

export const loanService = {
  getUserLoans: () => api.get<ExternalLoan[]>("/external-loans").then((res) => res.data),
  createLoan: (payload: CreateExternalLoanPayload) =>
    api.post<ExternalLoan>("/external-loans", payload).then((res) => res.data),
  updateLoan: (loanId: string, payload: UpdateExternalLoanPayload) =>
    api.put<ExternalLoan>(`/external-loans/${loanId}`, payload).then((res) => res.data),
  deleteLoan: (loanId: string) => api.delete<void>(`/external-loans/${loanId}`).then((res) => res.data),
};
