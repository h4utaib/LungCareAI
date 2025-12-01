import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, gradient, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="shadow-lg border-none overflow-hidden hover:shadow-xl transition-all duration-300">
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}