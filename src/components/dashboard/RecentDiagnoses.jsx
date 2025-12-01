import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Brain, Sparkles, Clock, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const diagnosisColors = {
  adenocarcinoma: "bg-red-100 text-red-800 border-red-200",
  large_cell_carcinoma: "bg-orange-100 text-orange-800 border-orange-200",
  squamous_cell_carcinoma: "bg-purple-100 text-purple-800 border-purple-200",
  normal: "bg-green-100 text-green-800 border-green-200",
};

const diagnosisLabels = {
  adenocarcinoma: "Adenocarcinoma",
  large_cell_carcinoma: "Large Cell Carcinoma",
  squamous_cell_carcinoma: "Squamous Cell Carcinoma",
  normal: "Normal",
};

// Helper function to determine the consensus between models
const getDiagnosisConsensus = (diagnoses, imageUrl) => {
  const dlDiagnosis = diagnoses.find(d => d.image_url === imageUrl && d.method === 'deep_learning');
  const medgemmaDiagnosis = diagnoses.find(d => d.image_url === imageUrl && d.method === 'medgemma');

  if (!dlDiagnosis || !medgemmaDiagnosis) {
    return null;
  }

  const dlType = dlDiagnosis.diagnosis_type;
  const medgemmaType = medgemmaDiagnosis.diagnosis_type;

  // Both say normal
  if (dlType === 'normal' && medgemmaType === 'normal') {
    return {
      status: 'normal',
      message: 'Both models confirm: No cancer detected',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
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
    };
  }

  return null;
};

export default function RecentDiagnoses({ diagnoses, isLoading }) {
  console.log('RecentDiagnoses - diagnoses:', diagnoses);
  console.log('RecentDiagnoses - diagnoses length:', diagnoses?.length);

  // Group diagnoses by image_url to pair DL and MedGemma results
  const groupedDiagnoses = (diagnoses || []).reduce((acc, diagnosis) => {
    if (!diagnosis.image_url) {
      console.warn('Diagnosis missing image_url:', diagnosis);
      return acc;
    }
    if (!acc[diagnosis.image_url]) {
      acc[diagnosis.image_url] = [];
    }
    acc[diagnosis.image_url].push(diagnosis);
    return acc;
  }, {});

  console.log('RecentDiagnoses - grouped:', groupedDiagnoses);

  // Convert to array and sort by most recent
  const diagnosisGroups = Object.entries(groupedDiagnoses)
    .map(([imageUrl, group]) => ({
      imageUrl,
      diagnoses: group,
      latestDate: Math.max(...group.map(d => new Date(d.created_date).getTime())),
    }))
    .sort((a, b) => b.latestDate - a.latestDate)
    .slice(0, 10);

  console.log('RecentDiagnoses - groups:', diagnosisGroups);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Recent Diagnoses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : diagnosisGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600">No diagnoses yet</p>
              <p className="text-sm text-slate-500 mt-1">Start by uploading a CT scan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnosisGroups.map((group, index) => {
                const consensus = getDiagnosisConsensus(group.diagnoses, group.imageUrl);
                const medgemmaDiagnosis = group.diagnoses.find(d => d.method === 'medgemma');
                const displayDiagnosis = medgemmaDiagnosis || group.diagnoses[0];
                const ConsensusIcon = consensus?.icon;

                return (
                  <motion.div
                    key={group.imageUrl}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border rounded-lg hover:shadow-md transition-shadow bg-white overflow-hidden"
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        medgemmaDiagnosis 
                          ? 'bg-gradient-to-br from-purple-400 to-pink-400'
                          : 'bg-gradient-to-br from-blue-400 to-cyan-400'
                      }`}>
                        {medgemmaDiagnosis ? (
                          <Sparkles className="w-6 h-6 text-white" />
                        ) : (
                          <Brain className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${diagnosisColors[displayDiagnosis.diagnosis_type]} border`}>
                            {diagnosisLabels[displayDiagnosis.diagnosis_type]}
                          </Badge>
                          {displayDiagnosis.confidence && (
                            <span className="text-xs text-slate-500">
                              {(displayDiagnosis.confidence * 100).toFixed(1)}% confidence
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="w-3 h-3" />
                          {format(new Date(displayDiagnosis.created_date), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {group.diagnoses.length === 2 ? 'Both Models' : displayDiagnosis.method === 'deep_learning' ? 'DL Model' : 'MedGemma'}
                      </Badge>
                    </div>

                    {/* Consensus message */}
                    {consensus && group.diagnoses.length === 2 && (
                      <div className={`${consensus.bgColor} px-4 py-3 border-t flex items-start gap-3`}>
                        <ConsensusIcon className={`w-5 h-5 ${consensus.color} mt-0.5 flex-shrink-0`} />
                        <p className={`text-sm font-medium ${consensus.color}`}>
                          {consensus.message}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}