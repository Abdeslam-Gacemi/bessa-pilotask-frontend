<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { dayjs } from "@/plugins/dayjs";
import { usePreferencesStore } from "@/stores/preferences";
import type { AnalyticsReport } from "@/types/models";

use([LineChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

/**
 * Created vs completed over the period: two series, one axis, 2px lines,
 * crosshair tooltip. Colours are validated per mode (CVD and contrast).
 */
const props = defineProps<{ data: AnalyticsReport["throughput"] }>();
const { t } = useI18n();
const prefs = usePreferencesStore();

const SERIES = {
  light: { created: "#2F7FD0", completed: "#22A06B", text: "#6C7277", grid: "#ECEAE4", surface: "#FFFFFF" },
  dark: { created: "#3F8FDB", completed: "#25A872", text: "#98A2A9", grid: "#262E34", surface: "#161C20" },
};

const option = computed(() => {
  const c = prefs.isDark ? SERIES.dark : SERIES.light;
  const line = (name: string, color: string, values: number[]) => ({
    name,
    type: "line",
    data: values,
    smooth: 0.3,
    symbol: "circle",
    symbolSize: 8,
    showSymbol: false,
    lineStyle: { width: 2, color },
    itemStyle: { color, borderColor: c.surface, borderWidth: 2 },
    emphasis: { focus: "series" },
  });

  return {
    animationDuration: 600,
    grid: { top: 36, left: 8, right: 12, bottom: 4, containLabel: true },
    legend: { top: 0, left: prefs.isRtl ? "right" : "left", align: prefs.isRtl ? "right" : "left", icon: "roundRect", itemWidth: 10, itemHeight: 10, textStyle: { color: c.text, fontFamily: "inherit" } },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: c.text, type: "dashed" } },
      backgroundColor: c.surface,
      borderColor: c.grid,
      textStyle: { color: prefs.isDark ? "#E8EDF0" : "#171E23", fontFamily: "inherit" },
    },
    xAxis: {
      type: "category",
      inverse: prefs.isRtl,
      boundaryGap: false,
      data: props.data.map((d) => dayjs(d.date).format("D MMM")),
      axisLine: { lineStyle: { color: c.grid } },
      axisTick: { show: false },
      axisLabel: { color: c.text, hideOverlap: true },
    },
    yAxis: {
      type: "value",
      position: prefs.isRtl ? "right" : "left",
      minInterval: 1,
      splitLine: { lineStyle: { color: c.grid } },
      axisLabel: { color: c.text },
    },
    series: [
      line(t("analytics.created"), c.created, props.data.map((d) => d.created)),
      line(t("analytics.completed"), c.completed, props.data.map((d) => d.completed)),
    ],
  };
});
</script>

<template>
  <!-- vue-echarts' own unlayered CSS sets height: 100%, which beats Tailwind utilities: size the wrapper instead. -->
  <!-- dir=ltr: the chart lays itself out (inverse axis, legend on the right) for RTL; letting the page's RTL
       reach the SVG text made legend labels overlap their swatches. -->
  <div class="h-64 w-full" dir="ltr">
    <VChart :option="option" autoresize />
  </div>
</template>
