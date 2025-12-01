import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import Layout from "./layout";

// ✅ Import all your pages
import Dashboard from "./pages/Dashboard";
import Diagnosis from "./pages/Diagnosis";
import DLDiagnosis from "./pages/DLDiagnosis";
import MedGemmaDiagnosis from "./pages/MedGemmaDiagnosis";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* 👇 Use Dashboard for both "/" and "/Dashboard" */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/Dashboard" element={<Dashboard />} />

            {/* Diagnosis pages */}
            <Route path="/Diagnosis" element={<Diagnosis />} />
            <Route path="/DLDiagnosis" element={<DLDiagnosis />} />
            <Route path="/MedGemmaDiagnosis" element={<MedGemmaDiagnosis />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
