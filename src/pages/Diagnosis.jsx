import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Brain, Sparkles, Loader2, AlertCircle, ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ImageUploadZone from "../components/dl/ImageUploadZone";
import DiagnosisResult from "../components/dl/DiagnosisResult";
import ReportActions from "../components/diagnosis/ReportActions";

export default function Diagnosis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dlResult, setDlResult] = useState(null);
  const [medgemmaResult, setMedgemmaResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

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
        icon: AlertTriangle,
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
        icon: AlertTriangle,
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

  // Helper function to normalize classification labels
  const normalizeClassification = (classification) => {
    const normalized = classification.toLowerCase().trim();
    
    // Map various formats to our enum values
    const mappings = {
      'adenocarcinoma': 'adenocarcinoma',
      'large cell carcinoma': 'large_cell_carcinoma',
      'large.cell.carcinoma': 'large_cell_carcinoma',
      'squamous cell carcinoma': 'squamous_cell_carcinoma',
      'squamous.cell.carcinoma': 'squamous_cell_carcinoma',
      'normal': 'normal',
    };

    return mappings[normalized] || normalized.replace(/\s+/g, '_').replace(/\./g, '_');
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    setDlResult(null);
    setMedgemmaResult(null);
    
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
    setDlResult(null);
    setMedgemmaResult(null);

    let tempDlResult = null;
    let tempMedgemmaResult = null;

    try {
      // Prepare FormData for Deep Learning API
      const dlFormData = new FormData();
      dlFormData.append("image", selectedFile);

      // Prepare FormData for MedGemma API
      const medgemmaFormData = new FormData();
      medgemmaFormData.append("image", selectedFile);

      // Call both APIs (they will save to MariaDB automatically)
      const dlPromise = fetch("http://127.0.0.1:5001/analyze", {
        method: "POST",
        body: dlFormData,
      }).then(res => res.ok ? res.json() : Promise.reject(res));

      const medgemmaPromise = fetch("http://127.0.0.1:5003/analyze", {
        method: "POST",
        body: medgemmaFormData,
      }).then(res => res.ok ? res.json() : Promise.reject(res));

      // Wait for both to complete (allow some to fail)
      const results = await Promise.allSettled([dlPromise, medgemmaPromise]);

      // Process Deep Learning result
      if (results[0].status === 'fulfilled') {
        const dlData = results[0].value;
        console.log('Deep Learning API Response:', dlData);
        
        const normalizedType = normalizeClassification(dlData.classification || dlData.prediction);
        const confidence = (dlData.confidence === 1 || dlData.confidence > 1) 
          ? dlData.confidence * 100 
          : dlData.confidence * 100;
        
        tempDlResult = {
          diagnosis_type: normalizedType,
          confidence: confidence,
          image_url: dlData.image_url || selectedFile.name,
          model: 'Deep Learning'
        };
        setDlResult(tempDlResult);
        console.log('Deep Learning result saved to MariaDB by Flask API');
      } else {
        console.error('Deep Learning API failed:', results[0].reason);
      }

      // Process MedGemma result
      if (results[1].status === 'fulfilled') {
        const medgemmaData = results[1].value;
        console.log('MedGemma API Response:', medgemmaData);
        
        const normalizedType = normalizeClassification(medgemmaData.classification || medgemmaData.prediction);
        const confidence = medgemmaData.confidence * 100;
        
        tempMedgemmaResult = {
          diagnosis_type: normalizedType,
          confidence: confidence,
          image_url: medgemmaData.image_url || selectedFile.name,
          model: 'MedGemma'
        };
        setMedgemmaResult(tempMedgemmaResult);
        console.log('MedGemma result saved to MariaDB by Flask API');
      } else {
        console.error('MedGemma API failed:', results[1].reason);
      }

      // Check if at least one succeeded
      if (!tempDlResult && !tempMedgemmaResult) {
        throw new Error('Both APIs failed. Please ensure Flask servers are running on ports 5001 and 5003.');
      }

      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });

    } catch (err) {
      console.error('Diagnosis error:', err);
      setError(err.message || 'Failed to process diagnosis. Check browser console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setDlResult(null);
    setMedgemmaResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7ORpnzr6n8LM_Gpjj1LVacj3fVzucOvAwZg&s')",
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" className="mb-4 hover:bg-blue-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                  AI Lung Cancer Diagnosis
                </h1>
                <p className="text-slate-600 mt-1">
                  Upload CT scan for analysis with both AI models simultaneously
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

          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Upload CT Scan Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ImageUploadZone
                      onFileSelect={handleFileSelect}
                      imagePreview={imagePreview}
                    />
                  </div>

                  <div className="space-y-4">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg h-12"
                      onClick={handleDiagnose}
                      disabled={!selectedFile || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Analyzing with Both Models...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Analyze with Both AI Models
                        </>
                      )}
                    </Button>

                    {(selectedFile || dlResult || medgemmaResult) && !isProcessing && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleReset}
                      >
                        Upload New Image
                      </Button>
                    )}

                    {!dlResult && !medgemmaResult && !isProcessing && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-slate-900 text-sm">Deep Learning Model</h4>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          <h4 className="font-semibold text-slate-900 text-sm">MedGemma Model</h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          Both models will analyze your CT scan simultaneously for comprehensive results.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Deep Learning Result */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AnimatePresence mode="wait">
                {dlResult ? (
                  <DiagnosisResult result={dlResult} modelName="Deep Learning" modelIcon={Brain} gradient="from-blue-500 to-cyan-500" />
                ) : (
                  <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[300px]">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-4">
                        {isProcessing ? (
                          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        ) : (
                          <Brain className="w-10 h-10 text-blue-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Deep Learning Model
                      </h3>
                      <p className="text-sm text-slate-600">
                        {isProcessing ? "Analyzing..." : "Awaiting analysis"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </AnimatePresence>
            </motion.div>

            {/* MedGemma Result */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AnimatePresence mode="wait">
                {medgemmaResult ? (
                  <DiagnosisResult result={medgemmaResult} modelName="MedGemma" modelIcon={Sparkles} gradient="from-purple-500 to-pink-500" />
                ) : (
                  <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm h-full">
                    <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[300px]">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                        {isProcessing ? (
                          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                        ) : (
                          <Sparkles className="w-10 h-10 text-purple-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        MedGemma Model
                      </h3>
                      <p className="text-sm text-slate-600">
                        {isProcessing ? "Analyzing..." : "Awaiting analysis"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Consensus Analysis - Only show when both results are available */}
          {dlResult && medgemmaResult && (() => {
            const consensus = getDiagnosisConsensus(dlResult, medgemmaResult);
            if (!consensus) return null;
            const ConsensusIcon = consensus.icon;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6"
              >
                <Card className={`shadow-xl border-2 ${consensus.borderColor} ${consensus.bgColor}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <ConsensusIcon className={`w-8 h-8 ${consensus.color} flex-shrink-0 mt-1`} />
                      <div>
                        <h3 className={`text-xl font-bold ${consensus.color} mb-2`}>
                          Consensus Analysis
                        </h3>
                        <p className={`text-base font-medium ${consensus.color}`}>
                          {consensus.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* Report Generation Section - Only show when both results are available */}
          {dlResult && medgemmaResult && (
            <ReportActions 
              dlResult={dlResult} 
              medgemmaResult={medgemmaResult}
              imageUrl={dlResult.image_url}
            />
          )}
        </div>
      </div>
    </div>
  );
}