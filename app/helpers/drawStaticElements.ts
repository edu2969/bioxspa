import { drawTimeline } from "../components/drawElements/drawTimeLine";
import { drawBg } from "../components/drawElements/drawBg";
import { drawTimelineEvents } from "../components/drawElements/drawTimeLineEvents";
import { drawTimelineEvent } from "../components/drawElements/drawLineEvent";

export const drawStaticElements = (
  rootElement: HTMLDivElement,
  windowSize: { width: number; height: number },
  timelineEvents: {
    color: string;
    ts: number;
    title: string;
  }[],
  currentTime: number
) => {
  const { width, height } = windowSize;

  drawBg(rootElement, windowSize);
  drawTimeline(rootElement, windowSize, timelineEvents);
  drawTimelineEvents(rootElement, windowSize, timelineEvents);

  if (timelineEvents[timelineEvents.length - 1].ts <= currentTime) {
    // prettier-ignore
    drawTimelineEvent(rootElement, windowSize, timelineEvents, timelineEvents[timelineEvents.length - 1].ts, "red");
  }
};