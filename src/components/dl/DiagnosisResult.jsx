import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const diagnosisInfo = {
  adenocarcinoma: {
    label: "Adenocarcinoma",
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
    icon: AlertTriangle,
    description: "A type of cancer that begins in the mucus-producing gland cells of the lungs.",
    severity: "High Risk",
  },
  large_cell_carcinoma: {
    label: "Large Cell Carcinoma",
    color: "from-orange-500 to-yellow-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-800",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    description: "A group of cancers with large, abnormal-looking cells under a microscope.",
    severity: "High Risk",
  },
  squamous_cell_carcinoma: {
    label: "Squamous Cell Carcinoma",
    color: "from-purple-500 to-indigo-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-800",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    icon: AlertTriangle,
    description: "Cancer that begins in squamous cells lining the airways of the lungs.",
    severity: "High Risk",
  },
  normal: {
    label: "Normal",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    badgeColor: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "No signs of lung cancer detected. Continue regular health monitoring.",
    severity: "Low Risk",
  },
};

export default function DiagnosisResult({ result, modelName, modelIcon: ModelIcon, gradient }) {
  const info = diagnosisInfo[result.diagnosis_type] || diagnosisInfo.normal;
  const Icon = info.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-xl border-none overflow-hidden h-full">
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />
        <CardHeader className={info.bgColor}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg`}>
              <ModelIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{modelName}</CardTitle>
            </div>
          </div>
          <Badge className={`${info.badgeColor} border text-sm px-3 py-1 w-fit`}>
            {info.label}
          </Badge>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Confidence Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">Confidence</span>
              <span className="text-xl font-bold text-slate-900">
                {result.confidence.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.confidence}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${gradient}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className={`${info.bgColor} rounded-lg p-3`}>
            <p className="text-slate-700 text-xs leading-relaxed">
              {info.description}
            </p>
          </div>

          {/* Severity */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Risk Level</span>
            </div>
            <Badge variant="outline" className={`${info.badgeColor} border-2 text-xs`}>
              {info.severity}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}