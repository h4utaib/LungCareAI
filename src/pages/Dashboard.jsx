import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Activity, Brain, Sparkles, Upload, ArrowRight, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import RecentDiagnoses from "../components/dashboard/RecentDiagnoses";

export default function Dashboard() {
  const { data: diagnoses = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['diagnoses'],
    queryFn: async () => {
      console.log('Fetching diagnosis records from MariaDB...');
      const response = await fetch('http://localhost:5001/diagnoses');
      if (!response.ok) {
        throw new Error('Failed to fetch diagnoses from database');
      }
      const data = await response.json();
      console.log('Fetched records from MariaDB:', data);
      return data;
    },
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    cacheTime: 0,
    retry: 3,
  });

  // Force refetch on mount
  useEffect(() => {
    console.log('Dashboard mounted, refetching data...');
    const timer = setTimeout(() => {
      refetch();
    }, 500);
    return () => clearTimeout(timer);
  }, [refetch]);

  // Group diagnoses by image_url to get unique scans
  const groupedByImage = diagnoses.reduce((acc, diagnosis) => {
    if (!acc[diagnosis.image_url]) {
      acc[diagnosis.image_url] = [];
    }
    acc[diagnosis.image_url].push(diagnosis);
    return acc;
  }, {});

  const getCounts = () => {
    const counts = {
      adenocarcinoma: 0,
      large_cell_carcinoma: 0,
      squamous_cell_carcinoma: 0,
      normal: 0,
    };

    // For each unique image, use MedGemma prediction if available, otherwise use any available prediction
    Object.values(groupedByImage).forEach(group => {
      const medgemmaDiagnosis = group.find(d => d.method === 'medgemma');
      const diagnosisToCount = medgemmaDiagnosis || group[0];
      
      if (counts.hasOwnProperty(diagnosisToCount.diagnosis_type)) {
        counts[diagnosisToCount.diagnosis_type]++;
      }
    });

    return counts;
  };

  const counts = getCounts();
  const totalDiagnoses = Object.values(groupedByImage).length;

  // Debug logging
  console.log('Dashboard - Total diagnoses:', diagnoses?.length || 0);
  console.log('Dashboard - Grouped by image:', Object.keys(groupedByImage).length);
  console.log('Dashboard - Counts:', counts);

  const statsData = [
    { label: "Adenocarcinoma", value: counts.adenocarcinoma, color: "text-red-600" },
    { label: "Large Cell Carcinoma", value: counts.large_cell_carcinoma, color: "text-orange-600" },
    { label: "Squamous Cell Carcinoma", value: counts.squamous_cell_carcinoma, color: "text-purple-600" },
    { label: "Normal", value: counts.normal, color: "text-green-600" },
    { label: "Total Diagnoses", value: totalDiagnoses, color: "text-blue-600" },
  ];

  const handleManualRefresh = () => {
    console.log('Manual refresh triggered');
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTP6OcsZ-tzD-4xQYH9veZb_nI3CyIu2cHcFg&s')",
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                  Lung Cancer Diagnosis System
                </h1>
                <p className="text-lg text-slate-600">
                  AI-Powered Deep Learning & MedGemma Analysis Platform
                </p>
              </div>
              <Button
                onClick={handleManualRefresh}
                disabled={isFetching}
                variant="outline"
                className="gap-2"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh Data
              </Button>
            </div>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load diagnosis data: {error.message}
                <br />
                <span className="text-xs">Make sure Flask API is running on port 5001</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isFetching && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-800">
                Loading diagnosis data from MariaDB...
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!isLoading && !isFetching && !error && diagnoses.length === 0 && (
            <Alert className="mb-6 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                No diagnosis records found. Upload and analyze CT scans to see data here.
                <br />
                <span className="text-xs">If you just analyzed an image, click the "Refresh Data" button above.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Left Side - Quick Action */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 border-none shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group h-full">
                  <Link to={createPageUrl("Diagnosis")}>
                    <CardContent className="p-10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Brain className="w-9 h-9 text-white" />
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                              <Sparkles className="w-9 h-9 text-white" />
                            </div>
                          </div>
                          <h3 className="text-3xl font-bold text-white mb-3">
                            Start AI Diagnosis
                          </h3>
                          <p className="text-white/90 mb-2 text-lg">
                            Upload CT scan images for instant analysis
                          </p>
                          <p className="text-white/80 mb-6">
                            Choose between Deep Learning or MedGemma AI models for advanced lung cancer detection
                          </p>
                          <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-blue-50 font-semibold">
                            Start Diagnosis <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                        <Upload className="w-16 h-16 text-white/20" />
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            </div>

            {/* Right Side - Stats Table */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1"
            >
              <Card className="shadow-xl border-none bg-white/80 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Diagnosis Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isFetching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Diagnosis Type</TableHead>
                          <TableHead className="text-right font-semibold">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsData.map((stat, index) => (
                          <TableRow key={stat.label} className={index === statsData.length - 1 ? 'border-t-2 border-slate-200' : ''}>
                            <TableCell className={`font-medium ${index === statsData.length - 1 ? 'font-bold' : ''}`}>
                              {stat.label}
                            </TableCell>
                            <TableCell className={`text-right text-2xl font-bold ${stat.color}`}>
                              {stat.value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Diagnoses */}
          <RecentDiagnoses diagnoses={diagnoses} isLoading={isFetching} />
        </div>
      </div>
    </div>
  );
}