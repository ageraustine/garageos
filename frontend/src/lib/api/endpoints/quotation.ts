// Quotation PDF API endpoints

import { API_BASE, getAuthToken } from "../client";

export const quotationApi = {
  getServicesPdfUrl: (preview = false) => {
    const token = getAuthToken();
    return `${API_BASE}/quotation/services/pdf?preview=${preview}&token=${token}`;
  },

  getJobPdfUrl: (jobId: number, preview = false) => {
    const token = getAuthToken();
    return `${API_BASE}/quotation/job/${jobId}/pdf?preview=${preview}&token=${token}`;
  },

  downloadServicesPdf: () => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/quotation/services/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.blob());
  },

  downloadJobPdf: (jobId: number) => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/quotation/job/${jobId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.blob());
  },

  previewServicesPdf: () => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/quotation/services/pdf?preview=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.blob());
  },

  previewJobPdf: (jobId: number) => {
    const token = getAuthToken();
    return fetch(`${API_BASE}/quotation/job/${jobId}/pdf?preview=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.blob());
  },
};
