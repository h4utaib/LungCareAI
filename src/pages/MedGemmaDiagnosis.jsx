
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Sparkles, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ImageUploadZone from "../components/dl/ImageUploadZone";
import DiagnosisResult from "../components/dl/DiagnosisResult";

export default function MedGemmaDiagnosis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const saveDiagnosisMutation = useMutation({
    mutationFn: (data) => base44.entities.DiagnosisRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
    },
  });

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDiagnose = async () => {
    if (!selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Upload image to base44
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // TODO: Call Flask API here for MedGemma model
      // Replace this mock with actual API call to your Flask backend
      const response = await fetch('YOUR_FLASK_API_URL/medgemma-predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: file_url }),
      });

      if (!response.ok) {
        throw new Error('Diagnosis failed');
      }

      const data = await response.json();
      
      // Expected format: { prediction: "adenocarcinoma", confidence: 0.95 }
      const diagnosisResult = {
        diagnosis_type: data.prediction,
        confidence: data.confidence * 100,
        image_url: file_url,
      };

      setResult(diagnosisResult);

      // Save to database
      await saveDiagnosisMutation.mutateAsync({
        diagnosis_type: data.prediction,
        method: "medgemma",
        confidence: data.confidence,
        image_url: file_url,
      });

    } catch (err) {
      console.error('Diagnosis error:', err);
      setError('Failed to process diagnosis. Please ensure your Flask API is running and accessible.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80')",
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" className="mb-4 hover:bg-purple-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:// ... keep existing code (imports) ...-4xl font-bold text-slate-900">
                  MedGemma Diagnosis
                </h1>
                <p className="text-slate-600 mt-1">
                  Advanced medical AI model for lung cancer detection
                </p>
              </div>
            </div>
          </motion.div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-500" />
                    Upload CT Scan Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUploadZone
                    onFileSelect={handleFileSelect}
                    imagePreview={imagePreview}
                  />

                  <div className="mt-6 space-y-3">
                    <Button
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                      onClick={handleDiagnose}
                      disabled={!selectedFile || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Analyze with MedGemma
                        </>
                      )}
                    </Button>

                    {(selectedFile || result) && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleReset}
                      >
                        Upload New Image
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {result ? (
                  <DiagnosisResult result={result} />
                ) : (
                  <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center h-full p-12 text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                        <Sparkles className="w-12 h-12 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        Awaiting Analysis
                      </h3>
                      <p className="text-slate-600 mb-6">
                        Upload a CT scan image and click "Analyze with MedGemma" to get diagnosis results
                      </p>
                      <div className="text-left bg-purple-50 rounded-lg p-4 w-full">
                        <h4 className="font-semibold text-purple-900 mb-2">Detection Types:</h4>
                        <ul className="space-y-1 text-sm text-purple-700">
                          <li>• Adenocarcinoma</li>
                          <li>• Large Cell Carcinoma</li>
                          <li>• Squamous Cell Carcinoma</li>
                          <li>• Normal (No cancer detected)</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
