import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Mail, Loader2, CheckCircle, Brain, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ReportActions({ dlResult, medgemmaResult, imageUrl }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [reportContent, setReportContent] = useState(null);
  const [showReport, setShowReport] = useState(false);

  // Patient information (can be made editable later)
  const patient = {
    name: "John Doe",
    age: 58,
    gender: "Male",
    medical_conditions: "Hypertension, Type 2 Diabetes",
    patient_history: "Former smoker (20 years), quit 5 years ago. Family history of lung cancer. Regular checkups for the past 3 years."
  };

  // Helper function to get consensus between both models
  const getDiagnosisConsensus = (dlResult, medgemmaResult) => {
    if (!dlResult || !medgemmaResult) {
      return null;
    }

    const dlType = dlResult.diagnosis_type;
    const medgemmaType = medgemmaResult.diagnosis_type;

    // Both say normal
    if (dlType === 'normal' && medgemmaType === 'normal') {
      return {
        status: 'normal',
        message: 'Both models confirm: No cancer detected',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }

    // Both say cancer - same type
    if (dlType !== 'normal' && medgemmaType !== 'normal' && dlType === medgemmaType) {
      return {
        status: 'confirmed',
        message: 'Both models confirm: Cancer detected',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }

    // Both say cancer - different types
    if (dlType !== 'normal' && medgemmaType !== 'normal' && dlType !== medgemmaType) {
      return {
        status: 'cancer_different',
        message: 'Cancer detected - Consult with doctor for confirmation',
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      };
    }

    // One says cancer, one says normal - Critical case
    if ((dlType === 'normal' && medgemmaType !== 'normal') || (dlType !== 'normal' && medgemmaType === 'normal')) {
      return {
        status: 'critical',
        message: 'Critical case - Consult with a radiologist immediately',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }

    return null;
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("http://localhost:5001/report/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dlResult,
          medgemmaResult,
          patient
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      
      // Convert hex string back to bytes and create download
      const pdfBytes = new Uint8Array(data.pdf.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Download the PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Store for email sending
      setGeneratedPdf({ pdf: data.pdf, filename: data.filename });
      setSuccess("PDF report generated and downloaded successfully!");
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report. Make sure Flask API is running.');
    } finally {
      setIsGenerating(false);
    }
  };

  const viewReport = async () => {
    setIsLoadingReport(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5001/report/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dlResult,
          medgemmaResult,
          patient
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data = await response.json();
      
      // Store PDF for later download/email
      setGeneratedPdf({ pdf: data.pdf, filename: data.filename });
      
      // Set report content for viewing
      setReportContent({
        patient,
        dlResult,
        medgemmaResult,
        generated_at: new Date().toISOString()
      });
      
      setShowReport(true);
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report. Make sure Flask API is running.');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const sendEmailReport = async () => {
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    // Generate PDF first if not already generated
    if (!generatedPdf) {
      setError("Please generate the report first");
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("http://localhost:5001/report/send-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          pdf: generatedPdf.pdf,
          filename: generatedPdf.filename
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      setSuccess(`Report sent to ${email} successfully!`);
      setEmail("");
    } catch (err) {
      console.error('Email sending error:', err);
      setError('Failed to send email. Check SMTP configuration in Flask API.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Generate Diagnostic Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Generate a comprehensive PDF medical report with AI-powered analysis.
          </p>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={viewReport}
              disabled={isLoadingReport || isGenerating || isSending}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white"
            >
              {isLoadingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  View Report
                </>
              )}
            </Button>

            <Button
              onClick={generateReport}
              disabled={isGenerating || isSending || isLoadingReport}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>

            <div className="border-t pt-4 space-y-3 md:col-span-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Send Report via Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
              />
              <Button
                onClick={sendEmailReport}
                disabled={isGenerating || isSending || isLoadingReport || !generatedPdf}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email Report
                  </>
                )}
              </Button>
              {!generatedPdf && (
                <p className="text-xs text-slate-500 text-center">
                  View or download the report first to enable email sending
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>

    {/* Report View Section */}
    <AnimatePresence>
      {showReport && reportContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-6"
        >
          <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                AI Diagnostic Report
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReport(false)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Information */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700">Name:</span>
                    <span className="ml-2 text-slate-600">{reportContent.patient.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Age:</span>
                    <span className="ml-2 text-slate-600">{reportContent.patient.age}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Gender:</span>
                    <span className="ml-2 text-slate-600">{reportContent.patient.gender}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-700">Medical Conditions:</span>
                    <span className="ml-2 text-slate-600">{reportContent.patient.medical_conditions}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-700">History:</span>
                    <span className="ml-2 text-slate-600">{reportContent.patient.patient_history}</span>
                  </div>
                </div>
              </div>

              {/* Consensus Analysis */}
              {(() => {
                const consensus = getDiagnosisConsensus(reportContent.dlResult, reportContent.medgemmaResult);
                if (!consensus) return null;
                const ConsensusIcon = consensus.icon;
                
                return (
                  <div className={`border-2 ${consensus.borderColor} ${consensus.bgColor} rounded-lg p-4 mb-6`}>
                    <div className="flex items-start gap-3">
                      <ConsensusIcon className={`w-6 h-6 ${consensus.color} flex-shrink-0 mt-0.5`} />
                      <div>
                        <h3 className={`text-base font-bold ${consensus.color} mb-1`}>
                          Consensus Analysis
                        </h3>
                        <p className={`text-sm font-medium ${consensus.color}`}>
                          {consensus.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* AI Model Findings */}
              <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3">AI Model Findings</h3>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-slate-900">Deep Learning Model</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Diagnosis:</span>
                        <span className="ml-2 text-slate-600 capitalize">{reportContent.dlResult.diagnosis_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Confidence:</span>
                        <span className="ml-2 text-slate-600">{reportContent.dlResult.confidence.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-slate-900">MedGemma Model</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Diagnosis:</span>
                        <span className="ml-2 text-slate-600 capitalize">{reportContent.medgemmaResult.diagnosis_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Confidence:</span>
                        <span className="ml-2 text-slate-600">{reportContent.medgemmaResult.confidence.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Important Notice</p>
                    <p>This report is AI-generated support information and not a medical diagnosis. Only a qualified healthcare professional can provide a definitive diagnosis. Please consult with a radiologist or oncologist for proper medical evaluation and treatment planning.</p>
                  </div>
                </div>
              </div>

              {/* Generated timestamp */}
              <div className="text-xs text-slate-500 text-center pt-2 border-t">
                Report generated on {new Date(reportContent.generated_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}