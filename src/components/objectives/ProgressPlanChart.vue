<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { dayjs } from "@/plugins/dayjs";
import { usePreferencesStore } from "@/stores/preferences";
import type { ObjectiveDetail } from "@/types/models";

use([LineChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, SVGRenderer]);

/**
 * Actual progress vs the plan (even pace), with the forecast dashed to the
 * end of the period. A real time axis, so today's point sits where it belongs.
 */
const props = defineProps<{ timeline: ObjectiveDetail["timeline"] }>();
const { t } = useI18n();
const prefs = usePreferencesStore();

const COLORS = {
  light: { actual: "#2F7FD0", plan: "#9AA0A4", forecast: "#2F7FD0", text: "#6C7277", grid: "#ECEAE4", surface: "#FFFFFF", ink: "#171E23" },
  dark: { actual: "#3F8FDB", plan: "#6B757C", forecast: "#3F8FDB", text: "#98A2A9", grid: "#262E34", surface: "#161C20", ink: "#E8EDF0" },
};

const option = computed(() => {
  const c = prefs.isDark ? COLORS.dark : COLORS.light;
  const ts = (d: string) => dayjs(d).valueOf();
  const actual = props.timeline.points.filter((p) => p.actual !== null).map((p) => [ts(p.date), p.actual]);
  const last = actual[actual.length - 1];
  const forecast = props.timeline.forecast && last ? [last, [ts(props.timeline.forecast.date), props.timeline.forecast.value]] : [];

  return {
    animationDuration: 600,
    grid: { top: 36, left: 8, right: 16, bottom: 4, containLabel: true },
    legend: { top: 0, left: prefs.isRtl ? "right" : "left", icon: "roundRect", itemWidth: 10, itemHeight: 10, textStyle: { color: c.text, fontFamily: "inherit" } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: c.text, type: "dashed" } },
      backgroundColor: c.surface,
      borderColor: c.grid,
      textStyle: { color: c.ink, fontFamily: "inherit" },
      valueFormatter: (v: number) => `${Math.round(v)}%`,
    },
    xAxis: {
      type: "time",
      inverse: prefs.isRtl,
      axisLine: { lineStyle: { color: c.grid } },
      axisTick: { show: false },
      axisLabel: { color: c.text, hideOverlap: true, formatter: (v: number) => dayjs(v).format("D MMM") },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      interval: 25,
      position: prefs.isRtl ? "right" : "left",
      splitLine: { lineStyle: { color: c.grid } },
      axisLabel: { color: c.text, formatter: "{value}%" },
    },
    series: [
      {
        name: t("objectives.chart.plan"),
        type: "line",
        data: props.timeline.points.map((p) => [ts(p.date), p.plan]),
        symbol: "none",
        lineStyle: { width: 1.5, color: c.plan, type: [4, 4] },
        itemStyle: { color: c.plan },
        markLine: {
          silent: true,
          symbol: "none",
          label: { formatter: t("objectives.chart.today"), color: c.text, position: "insideEndTop" },
          lineStyle: { color: c.text, type: "dotted", width: 1 },
          data: [{ xAxis: dayjs().valueOf() }],
        },
      },
      {
        name: t("objectives.chart.actual"),
        type: "line",
        data: actual,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,
        lineStyle: { width: 2.5, color: c.actual },
        itemStyle: { color: c.actual, borderColor: c.surface, borderWidth: 2 },
        areaStyle: { color: c.actual, opacity: 0.08 },
      },
      {
        name: t("objectives.chart.forecast"),
        type: "line",
        data: forecast,
        symbol: "circle",
        symbolSize: 7,
        showSymbol: false,
        lineStyle: { width: 2, color: c.forecast, type: "dashed", opacity: 0.7 },
        itemStyle: { color: c.forecast },
      },
    ],
  };
});
</script>

<template>
  <!-- Size the wrapper (vue-echarts sets height: 100%); dir=ltr: the chart handles RTL itself. -->
  <div class="h-64 w-full" dir="ltr">
    <VChart :option="option" autoresize />
  </div>
</template>
