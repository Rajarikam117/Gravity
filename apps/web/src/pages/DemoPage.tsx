import { ARScanner } from "../components/ar/ARScanner";

// Official MindAR sample assets — print the card image from:
// https://github.com/hiukim/mind-ar-js/blob/master/examples/image-tracking/assets/card-example/card.png
const DEMO_MIND =
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind";
const DEMO_VIDEO =
  "https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/video.mp4";

export default function DemoPage() {
  return (
    <ARScanner
      mindUrl={DEMO_MIND}
      videoUrl={DEMO_VIDEO}
      eventTitle="GRAVITY Demo"
    />
  );
}
