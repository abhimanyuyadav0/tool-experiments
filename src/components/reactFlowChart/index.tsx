"use client";

import React from "react";
import FlowChartV2 from "./flowChartV2/FlowChartV2";
import FlowChartV1 from "./flowChartV1/FlowChartV1";
import FlowChartV3 from "./flowChartV3/FlowChartV3";

export default function FlowChart() {
  return (
    <div className="relative w-full h-screen">
      {/* <FlowChartV1 /> */}
      <FlowChartV2 />
      {/* <FlowChartV3 /> */}
    </div>
  );
}
