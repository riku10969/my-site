import TopSection from "./components/sections/TopSection";
import ProjectsIntro from "./components/sections/ProjectsIntoro";
import BackgroundStage from "./components/webgl/BackgroundStage";
import RouteLogoController from "./components/ui/RouteLogoController";

export default function Page() {
  return (
    <>
      <TopSection />
      <BackgroundStage />
      <RouteLogoController/>
      <ProjectsIntro />
    </>
  );
}
